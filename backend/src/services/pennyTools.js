const { getUserExpenseRows, getBalances, getActiveRecurringExpenses, round2 } = require('./pennyData');

// Bedrock Converse "tool use" definitions - Claude picks one of these based on
// the question, we run the real query, and only then does it write an answer.
const TOOLS = [
  {
    toolSpec: {
      name: 'get_spending_summary',
      description:
        "Get the user's total spending and a per-category breakdown for a date range. Use this for questions like 'how much did I spend' or 'what's my biggest category'.",
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start date, inclusive, format YYYY-MM-DD' },
            end_date: { type: 'string', description: 'End date, inclusive, format YYYY-MM-DD' },
          },
          required: ['start_date', 'end_date'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'list_expenses',
      description:
        'List individual expenses in a date range, optionally filtered by one category, sorted by most recent first. Use this when the user wants specific transactions, not just a total.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            start_date: { type: 'string', description: 'Start date, inclusive, format YYYY-MM-DD' },
            end_date: { type: 'string', description: 'End date, inclusive, format YYYY-MM-DD' },
            category: { type: 'string', description: 'Optional category name to filter by, e.g. "Food"' },
            limit: { type: 'number', description: 'Max expenses to return, default 10' },
          },
          required: ['start_date', 'end_date'],
        },
      },
    },
  },
  {
    toolSpec: {
      name: 'get_balances',
      description:
        "Get the user's current net balances with other people from shared group expenses - who they owe money to, and who owes them. Use this for questions like 'who owes me' or 'do I owe anyone'.",
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
  {
    toolSpec: {
      name: 'get_recurring_expenses',
      description:
        "List the user's active recurring expenses (rent, subscriptions, bills, etc.) with amount, frequency, and next occurrence date.",
      inputSchema: { json: { type: 'object', properties: {} } },
    },
  },
];

async function executeTool(userId, toolName, input) {
  switch (toolName) {
    case 'get_spending_summary': {
      const rows = await getUserExpenseRows(userId, {
        startDate: input.start_date,
        endDate: input.end_date,
      });
      const total = round2(rows.reduce((sum, r) => sum + r.amount, 0));
      const byCategory = {};
      for (const r of rows) {
        byCategory[r.category] = round2((byCategory[r.category] || 0) + r.amount);
      }
      return { total, by_category: byCategory, expense_count: rows.length };
    }

    case 'list_expenses': {
      const rows = await getUserExpenseRows(userId, {
        startDate: input.start_date,
        endDate: input.end_date,
        categoryName: input.category,
      });
      const limit = input.limit || 10;
      return {
        expenses: rows
          .slice(0, limit)
          .map((r) => ({ date: r.date, description: r.description, category: r.category, amount: r.amount })),
      };
    }

    case 'get_balances':
      return getBalances(userId);

    case 'get_recurring_expenses':
      return { recurring_expenses: await getActiveRecurringExpenses(userId) };

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

module.exports = { TOOLS, executeTool };
