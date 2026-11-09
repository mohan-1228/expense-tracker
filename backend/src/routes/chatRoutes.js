const express = require('express');
const router = express.Router();
const { chatWithPenny } = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/penny', authMiddleware, chatWithPenny);

module.exports = router;
