// One-off script to populate realistic personal + group expense data for the
// existing real users, so the dashboard, calendar, weekly summary, and group
// balances all have something meaningful to show. Run with: node src/scripts/seedTestData.js
require('dotenv').config();
const pool = require('../config/db');

const CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const PERSONAL_DESCRIPTIONS = {
  1: ['Groceries', 'Lunch out', 'Dinner with friends', 'Coffee run', 'Takeout'],
  2: ['Gas fill-up', 'Parking', 'Toll'],
  3: ['Drinks at the bar', 'Coffee shop', 'Wine for dinner'],
  4: ['Monthly rent'],
  5: ['Internet bill'],
  6: ['Car insurance', 'Renters insurance'],
  7: ['Gym membership', 'Yoga class'],
  8: ['New shoes', 'Jacket', 'T-shirts'],
  9: ['Movie night', 'Concert ticket', 'Streaming subscription'],
  10: ['Pharmacy', 'Doctor visit copay'],
  11: ['Uber to airport', 'Hotel night'],
  12: ['Random stuff', 'Gift for a friend'],
  13: ['Electric bill', 'Water bill'],
  14: ['Weekly groceries', 'Costco run'],
};

const GROUP_DESCRIPTIONS = ['Dinner out', 'Groceries run', 'Utilities split', 'Weekend trip', 'Game night snacks'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomAmount(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function randomRecentDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, daysBack));
  return toDateStr(d);
}

async function seedPersonalExpenses(client, userId) {
  const count = randomInt(6, 9);
  for (let i = 0; i < count; i++) {
    const categoryId = randomChoice(CATEGORY_IDS);
    const description = randomChoice(PERSONAL_DESCRIPTIONS[categoryId]);
    const amount = randomAmount(5, 150);
    const date = randomRecentDate(20);

    await client.query(
      `INSERT INTO expenses (paid_by, category_id, amount, description, expense_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, categoryId, amount, description, date]
    );
  }
  return count;
}

async function seedGroupExpense(client, groupId, memberIds) {
  const payer = randomChoice(memberIds);
  const categoryId = randomChoice(CATEGORY_IDS);
  const amount = randomAmount(30, 220);
  const date = randomRecentDate(13);
  const description = randomChoice(GROUP_DESCRIPTIONS);

  const expenseResult = await client.query(
    `INSERT INTO expenses (paid_by, group_id, category_id, amount, description, expense_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [payer, groupId, categoryId, amount, description, date]
  );
  const expenseId = expenseResult.rows[0].id;

  const n = memberIds.length;
  const rawShare = amount / n;
  const roundedShare = Math.round(rawShare * 100) / 100;
  const totalRounded = roundedShare * n;
  const remainder = Math.round((amount - totalRounded) * 100) / 100;

  for (const memberId of memberIds) {
    const shareAmount = memberId === payer ? roundedShare + remainder : roundedShare;
    await client.query(
      `INSERT INTO expense_shares (expense_id, user_id, share_amount, is_settled)
       VALUES ($1, $2, $3, $4)`,
      [expenseId, memberId, shareAmount, memberId === payer]
    );
  }

  return { payer, amount, description, date };
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const usersResult = await client.query('SELECT id, name FROM users ORDER BY id');
    console.log(`Seeding personal expenses for ${usersResult.rows.length} users...`);
    for (const user of usersResult.rows) {
      const count = await seedPersonalExpenses(client, user.id);
      console.log(`  ${user.name} (id ${user.id}): +${count} personal expenses`);
    }

    const groupsResult = await client.query(
      `SELECT g.id, g.name, array_agg(gm.user_id) AS member_ids
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, g.name
       HAVING COUNT(gm.user_id) >= 2
       ORDER BY g.id`
    );

    console.log(`\nSeeding group expenses for ${groupsResult.rows.length} groups (skipping single-member groups)...`);
    for (const group of groupsResult.rows) {
      const expenseCount = randomInt(2, 3);
      for (let i = 0; i < expenseCount; i++) {
        const { payer, amount, description, date } = await seedGroupExpense(
          client,
          group.id,
          group.member_ids
        );
        console.log(`  ${group.name}: $${amount} "${description}" on ${date} (paid by user ${payer})`);
      }
    }

    await client.query('COMMIT');
    console.log('\nDone.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed, rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    pool.end();
  }
}

main();
