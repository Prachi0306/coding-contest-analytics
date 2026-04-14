const Contest = require('../models/Contest');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');

/**
 * Contest Controller — serves contest data from the database.
 */

/**
 * @route   GET /api/contests
 * @desc    Get a paginated list of contests
 * @access  Public
 */
const getContests = asyncHandler(async (req, res) => {
  const {
    platform = 'codeforces',
    page = 1,
    limit = 20,
    search,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Build query
  const query = { platform: platform.toLowerCase() };
  if (search) {
    query.$text = { $search: search };
  }

  // Execute query + count in parallel
  const [contests, total] = await Promise.all([
    Contest.find(query)
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Contest.countDocuments(query),
  ]);

  return sendSuccess(res, 200, 'Contests retrieved', {
    contests,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasMore: skip + contests.length < total,
    },
  });
});

/**
 * @route   GET /api/contests/:contestId
 * @desc    Get a single contest by platform + contestId
 * @access  Public
 */
const getContestById = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const { platform = 'codeforces' } = req.query;

  const contest = await Contest.findByPlatformAndId(
    platform.toLowerCase(),
    parseInt(contestId, 10)
  );

  if (!contest) {
    throw AppError.notFound(`Contest ${contestId} not found on ${platform}`);
  }

  return sendSuccess(res, 200, 'Contest retrieved', { contest });
});

/**
 * @route   GET /api/contests/stats
 * @desc    Get contest statistics (count per platform)
 * @access  Public
 */
const getContestStats = asyncHandler(async (req, res) => {
  const stats = await Contest.countByPlatform();

  const totalContests = stats.reduce((sum, s) => sum + s.count, 0);

  return sendSuccess(res, 200, 'Contest stats retrieved', {
    totalContests,
    byPlatform: stats.map((s) => ({ platform: s._id, count: s.count })),
  });
});

module.exports = {
  getContests,
  getContestById,
  getContestStats,
};
