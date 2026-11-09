const pool = require('../config/db');

const round2 = (n) => Math.round(n * 100) / 100;

async function getCategoryIdByName(userId, name) {
  const result = await pool.query(
    `SELECT id FROM categories WHERE (user_id IS NULL OR user_id = $1) AND LOWER(name) = LOWER($2)`,
    [userId, name]
  );
  return result.rows[0]?.id ?? null;
}

// Returns each expense already resolved to what this user actually paid: the
// full amount for personal expenses, their share for group ones.
async function getUserExpenseRows(userId, { startDate, endDate, categoryName } = {}) {
  const categoryId = categoryName ? await getCategoryIdByName(userId, categoryName) : null;

  const result = await pool.query(
    `SELECT
       CASE WHEN e.group_id IS NULL THEN e.amount ELSE es.share_amount END AS amount,
       e.description,
       to_char(e.expense_date, 'YYYY-MM-DD') AS date,
       COALESCE(c.name, 'Other') AS category
     FROM expenses e
     LEFT JOIN expense_shares es ON es.expense_id = e.id AND es.user_id = $1
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.expense_date BETWEEN $2 AND $3
       AND ($4::int IS NULL OR e.category_id = $4)
       AND (
         (e.group_id IS NULL AND e.paid_by = $1)
         OR (e.group_id IS NOT NULL AND es.user_id = $1)
       )
     ORDER BY e.expense_date DESC`,
    [userId, startDate, endDate, categoryId]
  );

  return result.rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

// Net balance per counterparty across every shared group, same netting logic
// used by the weekly summary and the group balances screen.
async function getBalances(userId) {
  const balanceResult = await pool.query(
    `SELECT es.user_id AS owes_user, e.paid_by AS owed_to_user, SUM(es.share_amount) AS amount
     FROM expense_shares es
     JOIN expenses e ON es.expense_id = e.id
     WHERE e.group_id IS NOT NULL AND es.is_settled = false
       AND (es.user_id = $1 OR e.paid_by = $1)
     GROUP BY es.user_id, e.paid_by`,
    [userId]
  );

  const netCents = {};
  for (const row of balanceResult.rows) {
    const owes = row.owes_user;
    const owedTo = row.owed_to_user;
    const cents = Math.round(parseFloat(row.amount) * 100);
    const pairKey = [owes, owedTo].sort((a, b) => a - b).join('-');
    netCents[pairKey] = (netCents[pairKey] || 0) + (owes < owedTo ? cents : -cents);
  }

  const counterpartyIds = new Set();
  const balances = Object.entries(netCents)
    .map(([pairKey, netAmount]) => {
      if (netAmount === 0) return null;
      const [idA, idB] = pairKey.split('-').map(Number);
      const owes = netAmount > 0 ? idA : idB;
      const owedTo = netAmount > 0 ? idB : idA;
      counterpartyIds.add(owes === userId ? owedTo : owes);
      return { owes, owedTo, amount: Math.abs(netAmount) / 100 };
    })
    .filter(Boolean);

  let nameById = {};
  if (counterpartyIds.size > 0) {
    const usersResult = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [
      [...counterpartyIds],
    ]);
    nameById = Object.fromEntries(usersResult.rows.map((u) => [u.id, u.name]));
  }

  const i_owe = balances
    .filter((b) => b.owes === userId)
    .map((b) => ({ name: nameById[b.owedTo], amount: round2(b.amount) }));

  const owed_to_me = balances
    .filter((b) => b.owedTo === userId)
    .map((b) => ({ name: nameById[b.owes], amount: round2(b.amount) }));

  return { i_owe, owed_to_me };
}

async function getActiveRecurringExpenses(userId) {
  const result = await pool.query(
    `SELECT name, amount, frequency, to_char(next_occurrence, 'YYYY-MM-DD') AS next_occurrence
     FROM recurring_templates
     WHERE user_id = $1 AND is_active = true
     ORDER BY next_occurrence`,
    [userId]
  );
  return result.rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

module.exports = { getUserExpenseRows, getBalances, getActiveRecurringExpenses, round2 };
