const pool = require('../config/db');

const createGroup = async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    if(!name) {
        return res.status(400).json({ message: 'Group name is required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO groups (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
            [name, description, userId]
        );
        const groupId = result.rows[0].id;

        await pool.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [groupId, userId]
        );  
        
        res.status(201).json({ message: 'Group created successfully', groupId });
    } catch (err) {
        console.error('Error creating group:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getGroups = async (req, res) => {
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    try {
        const result = await pool.query(
            'SELECT * FROM groups WHERE created_by = $1 ORDER BY name ASC',
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching groups:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    createGroup,
    getGroups
};