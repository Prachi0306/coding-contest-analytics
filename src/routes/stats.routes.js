const express = require('express');
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── Public Routes ──────────────────────────────────

/**
 * @route   GET /api/stats/leaderboard
 * @desc    Get leaderboard — top users by rating
 * @access  Public
 */
router.get('/leaderboard', statsController.getLeaderboard);

// ─── Private Routes ─────────────────────────────────

/**
 * @route   GET /api/stats/rating-history
 * @desc    Get authenticated user's rating history
 * @access  Private
 */
router.get('/rating-history', authenticate, statsController.getRatingHistory);

/**
 * @route   GET /api/stats/summary
 * @desc    Get authenticated user's aggregated stats summary
 * @access  Private
 */
router.get('/summary', authenticate, statsController.getStatsSummary);

/**
 * @route   GET /api/stats/contest-history
 * @desc    Get authenticated user's paginated contest history
 * @access  Private
 */
router.get('/contest-history', authenticate, statsController.getContestHistory);

/**
 * @route   GET /api/stats/latest-rating
 * @desc    Get authenticated user's latest rating
 * @access  Private
 */
router.get('/latest-rating', authenticate, statsController.getLatestRating);

/**
 * @route   GET /api/stats/codeforces-profile
 * @desc    Get live Codeforces profile for authenticated user
 * @access  Private
 */
router.get('/codeforces-profile', authenticate, statsController.getCodeforcesProfile);

module.exports = router;
