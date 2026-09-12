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

const getExpenses = async (req, res) => {
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    try {
        const result = await pool.query(
            'SELECT * FROM expenses WHERE paid_by = $1 ORDER BY expense_date DESC',
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching expenses:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};  

const updateExpense = async (req, res) => {
    const { id } = req.params;
    const { category_id, amount, description, expense_date } = req.body;
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    try {
        const result = await pool.query(
            'UPDATE expenses SET category_id = $1, amount = $2, description = $3, expense_date = $4 WHERE id = $5 AND paid_by = $6 RETURNING *',
            [category_id, amount, description, expense_date, id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Expense not found or you do not have permission to update it' });
        }

        res.status(200).json({ message: 'Expense updated successfully', expense: result.rows[0] });
    } catch (err) {
        console.error('Error updating expense:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}     

const deleteExpense = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    try {
        const result = await pool.query(
            'DELETE FROM expenses WHERE id = $1 AND paid_by = $2 RETURNING *',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Expense not found or you do not have permission to delete it' });
        }

        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (err) {
        console.error('Error deleting expense:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createExpense,
    getExpenses,
    updateExpense,
    deleteExpense,
};  

