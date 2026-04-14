const express = require('express');
const syncController = require('../controllers/sync.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── All sync routes require authentication ─────────

/**
 * @route   POST /api/sync/contests
 * @desc    Trigger Codeforces contest sync
 * @access  Private
 */
router.post('/contests', authenticate, syncController.syncContests);

/**
 * @route   POST /api/sync/my-ratings
 * @desc    Sync authenticated user's full data (contests + ratings)
 * @access  Private
 */
router.post('/my-ratings', authenticate, syncController.syncMyRatings);

module.exports = router;
