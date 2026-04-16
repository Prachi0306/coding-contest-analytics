const express = require('express');
const statsController = require('../controllers/stats.controller');
const cacheMiddleware = require('../middleware/cache.middleware');

const router = express.Router();

/**
 * @route   GET /api/leaderboard
 * @desc    Get leaderboard — ranking users by platform rating
 * @access  Public
 */
// Cache leaderboard results for 10 minutes (600 seconds)
router.get('/', cacheMiddleware(600), statsController.getLeaderboard);

module.exports = router;
