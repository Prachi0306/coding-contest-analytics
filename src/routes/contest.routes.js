const express = require('express');
const contestController = require('../controllers/contest.controller');
const cacheMiddleware = require('../middleware/cache.middleware');

const router = express.Router();

/**
 * @route   GET /api/contests/stats
 * @desc    Get contest statistics (count per platform)
 * @access  Public
 */
router.get('/stats', cacheMiddleware(3600), contestController.getContestStats);

/**
 * @route   GET /api/contests/:contestId
 * @desc    Get a single contest by ID
 * @access  Public
 */
router.get('/:contestId', cacheMiddleware(3600), contestController.getContestById);

/**
 * @route   GET /api/contests
 * @desc    Get paginated contest list with optional search
 * @access  Public
 */
router.get('/', cacheMiddleware(3600), contestController.getContests);

module.exports = router;
