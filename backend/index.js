require('dotenv').config();
const cors = require('cors');
const express = require('express');
const { Pool } = require('pg');
const cron = require('node-cron');
const generateRecurringExpenses = require('./src/jobs/generateRecurringExpenses');
const authRoutes = require('./src/routes/authRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const categoriesRoutes = require('./src/routes/categoriesRoutes');
const shareRoutes = require('./src/routes/shareRoutes');
const recurringTemplatesRoutes = require('./src/routes/recurringTemplatesRoutes'); // Import the category routes
const weeklySummaryRoutes = require('./src/routes/weeklySummaryRoutes');
const chatRoutes = require('./src/routes/chatRoutes');



// Comma-separated list, e.g. "https://app.example.com,https://www.app.example.com".
// Falls back to the local Vite dev server so nothing breaks without a .env change.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

const app = express();
app.use(express.json());
app.use(cors({ origin: allowedOrigins }));

// Mounted under /api so CloudFront can route everything under one
// path pattern to this backend, with everything else going to the
// S3-hosted frontend build.
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/groups', groupRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/recurring-templates', recurringTemplatesRoutes);
apiRouter.use('/shares', shareRoutes);
apiRouter.use('/weekly-summary', weeklySummaryRoutes);
apiRouter.use('/chat', chatRoutes);
app.use('/api', apiRouter);

// Runs once daily at 6:00 AM server time
cron.schedule('0 6 * * *', async () => {
  try {
    await generateRecurringExpenses();
  } catch (err) {
    console.error('Recurring job failed:', err);
  }
});


const port = process.env.PORT || 5001;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test route
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running');
});



// Test DB connection route
app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});