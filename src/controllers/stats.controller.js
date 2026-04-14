const UserStats = require('../models/UserStats');
const userRepository = require('../repositories/user.repository');
const codeforcesService = require('../services/codeforces.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');

/**
 * Stats Controller — serves user analytics and dashboard data.
 */

/**
 * @route   GET /api/stats/rating-history
 * @desc    Get authenticated user's rating history
 * @access  Private
 */
const getRatingHistory = asyncHandler(async (req, res) => {
  const { platform = 'codeforces' } = req.query;

  const history = await UserStats.getRatingHistory(req.user.id, platform);

  return sendSuccess(res, 200, 'Rating history retrieved', {
    platform,
    totalContests: history.length,
    history,
  });
});

/**
 * @route   GET /api/stats/summary
 * @desc    Get authenticated user's aggregated stats summary
 * @access  Private
 */
const getStatsSummary = asyncHandler(async (req, res) => {
  const { platform = 'codeforces' } = req.query;

  const summary = await UserStats.getStatsSummary(req.user.id, platform);

  if (!summary) {
    return sendSuccess(res, 200, 'No stats available yet. Sync your data first.', {
      platform,
      summary: null,
    });
  }

  return sendSuccess(res, 200, 'Stats summary retrieved', {
    platform,
    summary,
  });
});

/**
 * @route   GET /api/stats/contest-history
 * @desc    Get authenticated user's paginated contest history
 * @access  Private
 */
const getContestHistory = asyncHandler(async (req, res) => {
  const {
    platform,
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const options = { limit: limitNum, skip };
  if (platform) options.platform = platform;

  const history = await UserStats.getContestHistory(req.user.id, options);

  return sendSuccess(res, 200, 'Contest history retrieved', {
    page: pageNum,
    limit: limitNum,
    count: history.length,
    history,
  });
});

/**
 * @route   GET /api/stats/latest-rating
 * @desc    Get authenticated user's latest rating
 * @access  Private
 */
const getLatestRating = asyncHandler(async (req, res) => {
  const { platform = 'codeforces' } = req.query;

  const latest = await UserStats.getLatestRating(req.user.id, platform);

  return sendSuccess(res, 200, 'Latest rating retrieved', {
    platform,
    latest: latest || null,
  });
});

/**
 * @route   GET /api/stats/codeforces-profile
 * @desc    Get live Codeforces profile for authenticated user
 * @access  Private
 */
const getCodeforcesProfile = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user.id);
  const handle = user?.handles?.codeforces;

  if (!handle) {
    throw AppError.badRequest(
      'No Codeforces handle configured. Update your profile first.'
    );
  }

  const profile = await codeforcesService.getUserInfo(handle);

  return sendSuccess(res, 200, 'Codeforces profile retrieved', { profile });
});

/**
 * @route   GET /api/stats/leaderboard
 * @desc    Get leaderboard — top users by rating
 * @access  Public
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const {
    platform = 'codeforces',
    limit = 20,
  } = req.query;

  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const leaderboard = await UserStats.getLeaderboard(platform, limitNum);

  return sendSuccess(res, 200, 'Leaderboard retrieved', {
    platform,
    total: leaderboard.length,
    leaderboard,
  });
});

module.exports = {
  getRatingHistory,
  getStatsSummary,
  getContestHistory,
  getLatestRating,
  getCodeforcesProfile,
  getLeaderboard,
};
