const express = require('express');
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cache.middleware');

const router = express.Router();

// ─── Private Routes ─────────────────────────────────

/**
 * @route   GET /api/stats/rating-history
 * @desc    Get authenticated user's rating history
 * @access  Private
 */
router.get('/rating-history', authenticate, cacheMiddleware(300), statsController.getRatingHistory);

/**
 * @route   GET /api/stats/summary
 * @desc    Get authenticated user's aggregated stats summary
 * @access  Private
 */
router.get('/summary', authenticate, cacheMiddleware(300), statsController.getStatsSummary);

/**
 * @route   GET /api/stats/contest-history
 * @desc    Get authenticated user's paginated contest history
 * @access  Private
 */
router.get('/contest-history', authenticate, cacheMiddleware(300), statsController.getContestHistory);

/**
 * @route   GET /api/stats/latest-rating
 * @desc    Get authenticated user's latest rating
 * @access  Private
 */
router.get('/latest-rating', authenticate, cacheMiddleware(300), statsController.getLatestRating);

/**
 * @route   GET /api/stats/codeforces-profile
 * @desc    Get live Codeforces profile for authenticated user
 * @access  Private
 */
router.get('/codeforces-profile', authenticate, cacheMiddleware(900), statsController.getCodeforcesProfile);

module.exports = router;
