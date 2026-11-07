const express = require('express');
const router = express.Router();
const { signup, login, changePassword, updateProfile } = require ('../controllers/authControllers');
const authMiddleware = require('../middleware/authMiddleware');



router.post('/signup', signup);
router.post('/login', login);
router.post('/change-password', authMiddleware, changePassword);
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;
