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
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT groups.id, groups.name, groups.description
       FROM group_members
       JOIN groups ON group_members.group_id = groups.id
       WHERE group_members.user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const addGroupMember = async (req, res) => {
    const { groupId } = req.params;
    const {email } = req.body;
    const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

    try {
        // Check if the requesting user is a member of the group
        const membershipCheck = await pool.query(
            'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userId]
        );

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ message: 'You are not a member of this group' });
        }

        // Check if the user to be added exists
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userIdToAdd = userCheck.rows[0].id;

        // Check if the user is already a member of the group
        const existingMembership = await pool.query(
            'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, userIdToAdd]
        );

        if (existingMembership.rows.length > 0) {
            return res.status(400).json({ message: 'User is already a member of this group' });
        }

        // Add the new member to the group
        await pool.query(
            'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
            [groupId, userIdToAdd]
        );

        res.status(200).json({ message: 'Member added successfully' });
    } catch (err) {
        console.error('Error adding group member:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const getGroupBalances = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const membershipCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    const balanceResult = await pool.query(
      `SELECT es.user_id AS owes_user, e.paid_by AS owed_to_user, SUM(es.share_amount) AS amount_owed
       FROM expense_shares es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.group_id = $1 AND es.is_settled = false
       GROUP BY es.user_id, e.paid_by`,
      [groupId]
    );

    // Net the raw pairs together
    const netMap = {};
    balanceResult.rows.forEach(row => {
      const owes = row.owes_user;
      const owedTo = row.owed_to_user;
      const amount = parseFloat(row.amount_owed);
      const pairKey = [owes, owedTo].sort().join('-');

      if (!netMap[pairKey]) {
        netMap[pairKey] = 0;
      }

      if (owes < owedTo) {
        netMap[pairKey] += amount;
      } else {
        netMap[pairKey] -= amount;
      }
    });

    // Turn the net numbers into readable results
    const balances = Object.entries(netMap).map(([pairKey, netAmount]) => {
      const [idA, idB] = pairKey.split('-').map(Number);
      if (netAmount === 0) {
        return { userA: idA, userB: idB, status: 'settled' };
      }
      return netAmount > 0
        ? { owes: idA, owedTo: idB, amount: netAmount }
        : { owes: idB, owedTo: idA, amount: Math.abs(netAmount) };
    });

    res.status(200).json(balances);
  } catch (err) {
    console.error('Error fetching group balances:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

    
    









module.exports = {
    createGroup,
    getGroups,
    addGroupMember,
    getGroupBalances
};  

