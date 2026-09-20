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
};     

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

const createGroupExpense = async (req, res) => {
  const { groupId } = req.params;
  const { category_id, amount, description, expense_date } = req.body;
  const userId = req.user.id;

  if (!amount || !expense_date || !groupId) {
    return res.status(400).json({ message: 'Amount, expense date, and group ID are required' });
  }

  try {
    // Step 1: verify requester is a member of this group
    const membershipCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Step 2: get all members of this group
    const membersResult = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = $1',
      [groupId]
    );
    const memberIds = membersResult.rows.map(row => row.user_id);
    const numberOfMembers = memberIds.length;

    // Step 3: create the expense
    const expenseResult = await pool.query(
      'INSERT INTO expenses (paid_by, group_id, category_id, amount, description, expense_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [userId, groupId, category_id, amount, description, expense_date]
    );
    const expenseId = expenseResult.rows[0].id;

    // Step 4: calculate the split, handling rounding
    const rawShare = amount / numberOfMembers;
    const roundedShare = Math.round(rawShare * 100) / 100;
    const totalRounded = roundedShare * numberOfMembers;
    const remainder = Math.round((amount - totalRounded) * 100) / 100;

    // Step 5: insert one expense_shares row per member
    for (const memberId of memberIds) {
      const shareAmount = memberId === userId ? roundedShare + remainder : roundedShare;

      await pool.query(
        'INSERT INTO expense_shares (expense_id, user_id, share_amount, is_settled) VALUES ($1, $2, $3, $4)',
        [expenseId, memberId, shareAmount, memberId === userId]
      );
    }

    res.status(201).json({
      message: 'Group expense created and split successfully',
      expenseId,
      splitAmong: numberOfMembers,
      sharePerPerson: roundedShare,
    });
  } catch (err) {
    console.error('Error creating group expense:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { createExpense, getExpenses, updateExpense, deleteExpense, createGroupExpense };
  

