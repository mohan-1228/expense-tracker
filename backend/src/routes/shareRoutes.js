const express = require('express');
const router = express.Router();

const { settleShare } = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware'); 

router.patch('/:shareId/settle', authMiddleware, settleShare);

module.exports = router;    

