const Contest = require('../models/Contest');
const UserStats = require('../models/UserStats');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');

/**
 * Contest Controller — serves contest data from the database.
 */

/**
 * @route   GET /api/contests/categorized
 * @desc    Get contests split into ongoing, upcoming, and past
 * @access  Public (optionalAuth — marks attended contests if user is logged in)
 */
const getCategorizedContests = asyncHandler(async (req, res) => {
  const {
    platform = 'codeforces',
    pastPage = 1,
    pastLimit = 20,
    search,
  } = req.query;

  const now = new Date();
  const platformLower = platform.toLowerCase();
  const pastPageNum = Math.max(1, parseInt(pastPage, 10) || 1);
  const pastLimitNum = Math.min(100, Math.max(1, parseInt(pastLimit, 10) || 20));
  const pastSkip = (pastPageNum - 1) * pastLimitNum;

  // ─── Ongoing: phase is CODING or time-based check ──────────
  const ongoingQuery = {
    platform: platformLower,
    $or: [
      { phase: { $in: ['CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST'] } },
      {
        startTime: { $lte: now },
        $expr: {
          $gt: [
            { $add: ['$startTime', { $multiply: ['$duration', 1000] }] },
            now,
          ],
        },
      },
    ],
  };

  // ─── Upcoming: phase is BEFORE or startTime in the future ──
  const upcomingQuery = {
    platform: platformLower,
    $or: [
      { phase: 'BEFORE' },
      { startTime: { $gt: now } },
    ],
    // Exclude any that are already ongoing (overlap guard)
    phase: { $nin: ['CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST', 'FINISHED'] },
  };

  // ─── Past: phase is FINISHED or endTime in the past ────────
  const pastQuery = { platform: platformLower, phase: 'FINISHED' };
  if (search) {
    pastQuery.$text = { $search: search };
  }

  // Execute all queries in parallel
  const [ongoing, upcoming, pastContests, pastTotal] = await Promise.all([
    Contest.find(ongoingQuery).sort({ startTime: 1 }).lean(),
    Contest.find(upcomingQuery).sort({ startTime: 1 }).lean(),
    Contest.find(pastQuery).sort({ startTime: -1 }).skip(pastSkip).limit(pastLimitNum).lean(),
    Contest.countDocuments(pastQuery),
  ]);

  // ─── Mark attended past contests if user is authenticated ──
  let attendedContestIds = new Set();
  if (req.user) {
    const userStats = await UserStats.find({
      userId: req.user.id,
      platform: platformLower,
    }).select('contestId').lean();

    attendedContestIds = new Set(userStats.map((s) => String(s.contestId)));
  }

  const pastWithAttended = pastContests.map((c) => ({
    ...c,
    attended: attendedContestIds.has(String(c.contestId)),
  }));

  return sendSuccess(res, 200, 'Categorized contests retrieved', {
    platform: platformLower,
    ongoing,
    upcoming,
    past: {
      contests: pastWithAttended,
      pagination: {
        page: pastPageNum,
        limit: pastLimitNum,
        total: pastTotal,
        totalPages: Math.ceil(pastTotal / pastLimitNum),
        hasMore: pastSkip + pastContests.length < pastTotal,
      },
    },
  });
});

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
  getCategorizedContests,
  getContests,
  getContestById,
  getContestStats,
};
