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



const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://localhost:5173' }));

app.use('/auth',authRoutes);
app.use('/expenses', expenseRoutes);
app.use('/groups', groupRoutes); // Use the group routes
app.use('/categories', categoriesRoutes); // Use the category routes
app.use('/recurring-templates', recurringTemplatesRoutes); // Use the recurring templates routes
app.use('/shares', shareRoutes); // Use the share routes

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