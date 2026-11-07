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
      const amount = Math.round(parseFloat(row.amount_owed)*100);
      const pairKey = [owes, owedTo].sort((a, b) => a - b).join('-');

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
    const balances = Object.entries(netMap)
      .map(([pairKey, netAmount]) => {
      const [idA, idB] = pairKey.split('-').map(Number);
      if (netAmount === 0) {
       return { userA: idA, userB: idB, status: 'settled' };
      }
      return netAmount > 0
        ? { owes: idA, owedTo: idB, amount: netAmount/100 }
        : { owes: idB, owedTo: idA, amount: Math.abs(netAmount)/100 };
    })
      .filter((b) => b.status !== 'settled');

    const userIds = [...new Set(balances.flatMap((b) => [b.owes, b.owedTo]))];

    if (userIds.length === 0) {
      return res.status(200).json([]);
    }

    const usersResult = await pool.query(
      'SELECT id, name FROM users WHERE id = ANY($1)',
      [userIds]
    );

    const nameById = {};
    usersResult.rows.forEach((u) => {
      nameById[u.id] = u.name;
    });

    const withNames = balances.map((b) => ({
      ...b,
      owesName: nameById[b.owes],
      owedToName: nameById[b.owedTo],
    }));

res.status(200).json(withNames);
  } catch (err) {
    console.error('Error fetching group balances:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};



const getGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const membershipCheck = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membershipCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const groupResult = await pool.query(
      'SELECT id, name, description, created_by FROM groups WHERE id = $1',
      [groupId]
    );

    const membersResult = await pool.query(
      'SELECT u.id, u.name, u.email FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = $1 ORDER BY u.name',
      [groupId]
    );

    res.status(200).json({
      ...groupResult.rows[0],
      members: membersResult.rows,
    });
  } catch (err) {
    console.error('Error fetching group:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};


const settleWithMember = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const withUserId = Number(req.body.withUserId);

  if (!Number.isInteger(withUserId) || withUserId === userId) {
    return res
      .status(400)
      .json({ message: 'A valid withUserId (another member) is required' });
  }

  try {
    const membership = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = ANY($2)',
      [groupId, [userId, withUserId]]
    );
    const memberIds = membership.rows.map((r) => r.user_id);

    if (!memberIds.includes(userId)) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (!memberIds.includes(withUserId)) {
      return res.status(400).json({ message: 'That user is not in this group' });
    }


    const result = await pool.query(
      `UPDATE expense_shares es
      SET is_settled = true
      FROM expenses e
      WHERE es.expense_id = e.id
        AND e.group_id = $1
        AND es.is_settled = false
        AND (
          (es.user_id = $2 AND e.paid_by = $3)
          OR (es.user_id = $3 AND e.paid_by = $2)
        )
      RETURNING es.id`,
      [groupId, userId, withUserId]
    );

    res.status(200).json({
      message: 'Settled',
      settledShares: result.rowCount,
    });

    
  } catch (err) {
    console.error('Error settling with member:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
    
    









const hasOutstandingBalance = async (groupId, userId) => {
  const result = await pool.query(
    `SELECT 1 FROM expense_shares es
     JOIN expenses e ON es.expense_id = e.id
     WHERE e.group_id = $1 AND es.is_settled = false
       AND (es.user_id = $2 OR e.paid_by = $2)
     LIMIT 1`,
    [groupId, userId]
  );
  return result.rows.length > 0;
};

const leaveGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const membership = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membership.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (await hasOutstandingBalance(groupId, userId)) {
      return res.status(409).json({ message: 'Settle up with the group before leaving' });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    res.status(200).json({ message: 'Left group successfully' });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const removeGroupMember = async (req, res) => {
  const { groupId, userId: memberIdParam } = req.params;
  const requesterId = req.user.id;
  const memberId = Number(memberIdParam);

  try {
    const groupResult = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groupResult.rows[0].created_by !== requesterId) {
      return res.status(403).json({ message: 'Only the group creator can remove members' });
    }
    if (memberId === requesterId) {
      return res.status(400).json({ message: 'Use the leave group action to remove yourself' });
    }

    const membership = await pool.query(
      'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberId]
    );
    if (membership.rows.length === 0) {
      return res.status(404).json({ message: 'That user is not a member of this group' });
    }

    if (await hasOutstandingBalance(groupId, memberId)) {
      return res.status(409).json({ message: 'That member has an outstanding balance in this group' });
    }

    await pool.query(
      'DELETE FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, memberId]
    );

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing group member:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteGroup = async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;

  try {
    const groupResult = await pool.query('SELECT created_by FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (groupResult.rows[0].created_by !== userId) {
      return res.status(403).json({ message: 'Only the group creator can delete this group' });
    }

    const expenseCheck = await pool.query('SELECT 1 FROM expenses WHERE group_id = $1 LIMIT 1', [groupId]);
    if (expenseCheck.rows.length > 0) {
      return res.status(409).json({ message: 'Cannot delete a group that has expenses' });
    }

    await pool.query('DELETE FROM groups WHERE id = $1', [groupId]);
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
    createGroup,
    getGroups,
    addGroupMember,
    getGroupBalances,
    getGroup,
    settleWithMember,
    leaveGroup,
    removeGroupMember,
    deleteGroup,
};

