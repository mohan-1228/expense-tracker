const express = require('express');
const router = express.Router();
const { signup, login, changePassword, updateProfile, forgotPassword, resetPassword, verifyEmail, resendVerification } = require ('../controllers/authControllers');
const authMiddleware = require('../middleware/authMiddleware');



router.post('/signup', signup);
router.post('/login', login);
router.post('/change-password', authMiddleware, changePassword);
router.put('/profile', authMiddleware, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);

module.exports = router;
