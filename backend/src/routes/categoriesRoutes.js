const express = require('express');
const router = express.Router();
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoriesController');
const authMiddleware = require('../middleware/authMiddleware'); // Assuming you have an authentication middleware

// Route to get all categories for the authenticated user
router.get('/', authMiddleware, getCategories);
// Route to create a custom category
router.post('/', authMiddleware, createCategory);
// Route to delete a custom category
router.delete('/:id', authMiddleware, deleteCategory);

module.exports = router;
