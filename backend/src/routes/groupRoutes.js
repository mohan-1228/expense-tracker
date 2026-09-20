const express = require('express');
const router = express.Router();
const { createGroup, getGroups, addGroupMember } = require('../controllers/groupController');  
const { createGroupExpense } = require('../controllers/expenseController'); // Import the createGroupExpense function
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware
// Route to create a new group
router.post('/', authMiddleware , createGroup);
// Route to get all groups for the authenticated user
router.get('/', authMiddleware, getGroups);

router.post('/:groupId/members', authMiddleware, addGroupMember); // Route to add a member to a group
router.post('/:groupId/expenses', authMiddleware, createGroupExpense);
module.exports = router;    