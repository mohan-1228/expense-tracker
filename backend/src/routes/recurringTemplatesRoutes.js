const express = require('express');
const router = express.Router();
const { createTemplate, getTemplates, updateTemplate, deactivateTemplate } = require('../controllers/recurringTemplatesController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createTemplate);
router.get('/', authMiddleware, getTemplates);
router.put('/:id', authMiddleware, updateTemplate);
router.post('/:id/deactivate', authMiddleware, deactivateTemplate);

module.exports = router;