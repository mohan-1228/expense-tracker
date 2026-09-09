const pool = require('../config/db');

const createExpense = async (req, res) => {
    const { category_id, amount, description, expense_date } = req.body;
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    if(!amount || !expense_date) {
        return res.status(400).json({ message: 'Amount and expense date are required' });
    }   

    try {
        const result = await pool.query(
            'INSERT INTO expenses (paid_by, category_id, amount, description, expense_date ) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [userId, category_id, amount, description, expense_date]
        );        
        const expenseId = result.rows[0].id;
        res.status(201).json({ message: 'Expense created successfully', expenseId });        
    } catch (err) {
        console.error('Error creating expense:', err);
        res.status(500).json({ message: 'Internal server error' }); 

    }

};  

module.exports = {
    createExpense,
};  

