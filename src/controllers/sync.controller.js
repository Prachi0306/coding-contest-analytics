const dataSyncService = require('../services/dataSync.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Sync Controller — triggers data sync operations.
 * All sync endpoints are private (require authentication).
 */

/**
 * @route   POST /api/sync/contests
 * @desc    Trigger a Codeforces contest sync
 * @access  Private
 */
const syncContests = asyncHandler(async (req, res) => {
  const result = await dataSyncService.syncCodeforcesContests();

  return sendSuccess(res, 200, 'Contest sync complete', result);
});

/**
 * @route   POST /api/sync/my-ratings
 * @desc    Sync authenticated user's rating history from Codeforces
 * @access  Private
 */
const syncMyRatings = asyncHandler(async (req, res) => {
  const result = await dataSyncService.syncUserData(req.user.id);

  return sendSuccess(res, 200, 'Data sync complete', result);
});

module.exports = {
  syncContests,
  syncMyRatings,
};
