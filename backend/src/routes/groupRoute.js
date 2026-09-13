const express = require('express');
const router = express.Router();
const { createGroup, getGroups } = require('../controllers/groupController');  
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware
// Route to create a new group
router.post('/', authMiddleware , createGroup);
// Route to get all groups for the authenticated user
router.get('/', authMiddleware, getGroups);

module.exports = router;