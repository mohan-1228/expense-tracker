const express = require('express');
const router = express.Router();
const { getCategories } = require('../controllers/categoriesController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware

// Route to get all categories for the authenticated user
router.get('/', authMiddleware, getCategories);

module.exports = router;