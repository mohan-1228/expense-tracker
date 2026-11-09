const pool = require('../config/db');
const { generateSummaryText, buildFallbackSummary } = require('../services/bedrockSummary');

const round2 = (n) => Math.round(n * 100) / 100;

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d, n) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function toDateStr(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// The DB does the arithmetic; the model only turns this JSON into sentences.
async function computeWeeklyFacts(userId, weekStartParam) {
  const weekStart = mondayOf(weekStartParam ? `${weekStartParam}T00:00:00` : new Date());
  const weekEnd = addDays(weekStart, 6);
  const lastWeekStart = addDays(weekStart, -7);

  const weekStartStr = toDateStr(weekStart);
  const weekEndStr = toDateStr(weekEnd);
  const lastWeekStartStr = toDateStr(lastWeekStart);

  // One expense per row, already resolved to "what this user actually owes/paid" (their
  // own full amount for personal expenses, their share for group ones), with period
  // classification and date formatting done in SQL to avoid JS Date timezone shifts.
  const expensesResult = await pool.query(
    `SELECT
       e.id,
       e.category_id,
       CASE WHEN e.group_id IS NULL THEN e.amount ELSE es.share_amount END AS amount,
       e.description,
       to_char(e.expense_date, 'YYYY-MM-DD') AS expense_date,
       CASE WHEN e.expense_date >= $2 THEN 'this' ELSE 'last' END AS period
     FROM expenses e
     LEFT JOIN expense_shares es ON es.expense_id = e.id AND es.user_id = $1
     WHERE e.expense_date BETWEEN $3 AND $4
       AND (
         (e.group_id IS NULL AND e.paid_by = $1)
         OR (e.group_id IS NOT NULL AND es.user_id = $1)
       )`,
    [userId, weekStartStr, lastWeekStartStr, weekEndStr]
  );

  const categoriesResult = await pool.query(
    `SELECT id, name FROM categories WHERE user_id IS NULL OR user_id = $1`,
    [userId]
  );
  const categoryNameById = Object.fromEntries(categoriesResult.rows.map((c) => [c.id, c.name]));

  const thisWeekRows = [];
  const lastWeekRows = [];

  for (const row of expensesResult.rows) {
    const entry = {
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      date: row.expense_date,
      category: categoryNameById[row.category_id] || 'Other',
    };
    (row.period === 'this' ? thisWeekRows : lastWeekRows).push(entry);
  }

  const sum = (rows) => rows.reduce((acc, r) => acc + r.amount, 0);
  const thisWeekTotal = sum(thisWeekRows);
  const lastWeekTotal = sum(lastWeekRows);

  const byCategory = (rows) => {
    const totals = {};
    for (const r of rows) {
      totals[r.category] = (totals[r.category] || 0) + r.amount;
    }
    return totals;
  };

  const thisWeekByCategory = byCategory(thisWeekRows);
  const lastWeekByCategory = byCategory(lastWeekRows);

  const categoryNames = new Set([
    ...Object.keys(thisWeekByCategory),
    ...Object.keys(lastWeekByCategory),
  ]);

  const categories = [...categoryNames]
    .map((name) => {
      const thisTotal = round2(thisWeekByCategory[name] || 0);
      const lastTotal = round2(lastWeekByCategory[name] || 0);
      return {
        name,
        this_week_total: thisTotal,
        last_week_total: lastTotal,
        change: round2(thisTotal - lastTotal),
      };
    })
    .sort((a, b) => b.this_week_total - a.this_week_total);

  const topCategory = categories[0] || null;
  const biggestCategoryChange = categories.length
    ? categories.reduce((a, b) => (Math.abs(b.change) > Math.abs(a.change) ? b : a))
    : null;

  const topExpenses = [...thisWeekRows]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((r) => ({
      description: r.description,
      amount: round2(r.amount),
      date: r.date,
      category: r.category,
    }));

  // Outstanding group balances are running totals, not scoped to this week.
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

  const iOwe = balances
    .filter((b) => b.owes === userId)
    .map((b) => ({ userId: b.owedTo, name: nameById[b.owedTo], amount: round2(b.amount) }));

  const owedToMe = balances
    .filter((b) => b.owedTo === userId)
    .map((b) => ({ userId: b.owes, name: nameById[b.owes], amount: round2(b.amount) }));

  return {
    week_start: weekStartStr,
    week_end: weekEndStr,
    this_week_total: round2(thisWeekTotal),
    last_week_total: round2(lastWeekTotal),
    percent_change:
      lastWeekTotal > 0 ? round2(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100) : null,
    categories,
    top_category: topCategory,
    biggest_category_change: biggestCategoryChange,
    top_expenses: topExpenses,
    i_owe: iOwe,
    owed_to_me: owedToMe,
  };
}

const getWeeklyFacts = async (req, res) => {
  try {
    const facts = await computeWeeklyFacts(req.user.id, req.query.week_start);
    res.json(facts);
  } catch (err) {
    console.error('Error computing weekly facts:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Reads whatever is already cached for the week - never calls Bedrock.
const getWeeklySummary = async (req, res) => {
  try {
    const weekStart = toDateStr(
      mondayOf(req.query.week_start ? `${req.query.week_start}T00:00:00` : new Date())
    );
    const result = await pool.query(
      'SELECT * FROM weekly_summaries WHERE user_id = $1 AND week_start = $2',
      [req.user.id, weekStart]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error('Error fetching weekly summary:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Generates and caches a summary for the week. If one is already cached, returns
// it as-is instead of calling Bedrock again - this is what keeps cost predictable.
const generateWeeklySummary = async (req, res) => {
  const userId = req.user.id;

  try {
    const weekStartParam = req.body?.week_start;
    const weekStart = toDateStr(
      mondayOf(weekStartParam ? `${weekStartParam}T00:00:00` : new Date())
    );

    const existing = await pool.query(
      'SELECT * FROM weekly_summaries WHERE user_id = $1 AND week_start = $2',
      [userId, weekStart]
    );
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    const facts = await computeWeeklyFacts(userId, weekStartParam);

    let summaryText;
    let generatedByAi = true;
    try {
      summaryText = await generateSummaryText(facts);
    } catch (err) {
      console.error('Bedrock call failed, falling back to a plain-stats summary:', err);
      summaryText = buildFallbackSummary(facts);
      generatedByAi = false;
    }

    const insertResult = await pool.query(
      `INSERT INTO weekly_summaries (user_id, week_start, summary_text, facts_json, generated_by_ai)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, weekStart, summaryText, JSON.stringify(facts), generatedByAi]
    );

    res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error generating weekly summary:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { computeWeeklyFacts, getWeeklyFacts, getWeeklySummary, generateWeeklySummary };
