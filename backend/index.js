require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const authRoutes = require('./src/routes/authRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const groupRoutes = require('./src/routes/groupRoutes'); // Import the group routes



const app = express();
app.use(express.json());

app.use('/auth',authRoutes);
app.use('/expenses', expenseRoutes);
app.use('/groups', groupRoutes); // Use the group routes


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