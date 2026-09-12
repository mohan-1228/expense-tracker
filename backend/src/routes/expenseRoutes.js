const express = require('express');
const router = express.Router();
const {createExpense, getExpenses, updateExpense, deleteExpense} = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware

// Route to create a new expense
router.post('/', authMiddleware, createExpense);            
// Route to get all expenses for the authenticated user
router.get('/', authMiddleware, getExpenses);
// Route to update an expense by ID
router.put('/:id', authMiddleware, updateExpense); 
// Route to delete an expense by ID
router.delete('/:id', authMiddleware, deleteExpense);
module.exports = router;

