const pool = require('../config/db');

function getNextOccurrence(currentDate, frequency) {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
  return date.toISOString().split('T')[0]; // → "YYYY-MM-DD"
}

async function generateRecurringExpenses() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const due = await client.query(
      `SELECT * FROM recurring_templates
       WHERE is_active = true AND next_occurrence <= CURRENT_DATE
       FOR UPDATE`
    );

    console.log(`Found ${due.rows.length} due template(s)`);

    for (const template of due.rows) {
      const existing = await client.query(
        `SELECT 1 FROM expenses WHERE recurring_template_id = $1 AND expense_date = $2`,
        [template.id, template.next_occurrence]
      );
      if (existing.rows.length > 0) {
        console.log(`Skipping template ${template.id} — already generated for ${template.next_occurrence}`);
        continue;
      }

      await client.query(
        `INSERT INTO expenses
           (paid_by, category_id, amount, description, expense_date, recurring_template_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          template.user_id,
          template.category_id,
          template.amount,
          template.description || template.name,
          template.next_occurrence,
          template.id,
        ]
      );

      const nextDate = getNextOccurrence(template.next_occurrence, template.frequency);

      await client.query(
        `UPDATE recurring_templates SET next_occurrence = $1 WHERE id = $2`,
        [nextDate, template.id]
      );

      console.log(`Processed template ${template.id} (${template.name}) → next due ${nextDate}`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Recurring expense generation failed:', err);
  } finally {
    client.release();
  }
}

module.exports = generateRecurringExpenses;