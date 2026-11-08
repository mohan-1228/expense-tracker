const express = require('express');
const router = express.Router();
const { createTemplate, getTemplates, updateTemplate, deactivateTemplate, reactivateTemplate } = require('../controllers/recurringTemplatesController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createTemplate);
router.get('/', authMiddleware, getTemplates);
router.put('/:id', authMiddleware, updateTemplate);
router.post('/:id/deactivate', authMiddleware, deactivateTemplate);
router.post('/:id/reactivate', authMiddleware, reactivateTemplate);

module.exports = router;