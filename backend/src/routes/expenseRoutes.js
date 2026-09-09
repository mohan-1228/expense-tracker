const express = require('express');
const router = express.Router();
const {createExpense} = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware

// Route to create a new expense
router.post('/', authMiddleware, createExpense);    

module.exports = router;

