const express = require('express');
const router = express.Router();
const { createGroup, getGroups, addGroupMember, getGroupBalances, getGroup, settleWithMember, leaveGroup, removeGroupMember, deleteGroup } = require('../controllers/groupController');
const { createGroupExpense, updateGroupExpense, deleteGroupExpense } = require('../controllers/expenseController'); // Import the group expense functions
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware
// Route to create a new group
router.post('/', authMiddleware , createGroup);
// Route to get all groups for the authenticated user
router.get('/', authMiddleware, getGroups);

router.post('/:groupId/members', authMiddleware, addGroupMember); // Route to add a member to a group
router.post('/:groupId/expenses', authMiddleware, createGroupExpense);
router.put('/:groupId/expenses/:expenseId', authMiddleware, updateGroupExpense);
router.delete('/:groupId/expenses/:expenseId', authMiddleware, deleteGroupExpense);
router.get('/:groupId/balance', authMiddleware, getGroupBalances);
router.get('/:groupId', authMiddleware, getGroup);
router.post('/:groupId/settle', authMiddleware, settleWithMember);
router.post('/:groupId/leave', authMiddleware, leaveGroup);
router.delete('/:groupId/members/:userId', authMiddleware, removeGroupMember);
router.delete('/:groupId', authMiddleware, deleteGroup);

module.exports = router;