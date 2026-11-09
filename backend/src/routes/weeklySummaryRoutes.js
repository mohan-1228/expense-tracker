const express = require('express');
const router = express.Router();
const {
  getWeeklyFacts,
  getWeeklySummary,
  generateWeeklySummary,
} = require('../controllers/weeklySummaryController');
const authMiddleware = require('../middleware/authMiddleware');

// Returns the raw aggregated facts for a week (defaults to the current week).
router.get('/facts', authMiddleware, getWeeklyFacts);
// Returns the cached AI summary for a week, if one has been generated.
router.get('/', authMiddleware, getWeeklySummary);
// Generates (or returns the already-cached) summary for a week.
router.post('/generate', authMiddleware, generateWeeklySummary);

module.exports = router;
