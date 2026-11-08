const express = require('express');
const router = express.Router();
const { getWeeklyFacts } = require('../controllers/weeklySummaryController');
const authMiddleware = require('../middleware/authMiddleware');

// Returns the raw aggregated facts for a week (defaults to the current week).
// No AI involved yet - this is the data the model will eventually turn into sentences.
router.get('/facts', authMiddleware, getWeeklyFacts);

module.exports = router;
