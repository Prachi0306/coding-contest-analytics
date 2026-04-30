const Contest = require('../models/Contest');
const UserStats = require('../models/UserStats');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');




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
        phase: { $nin: ['FINISHED'] }
      },
    ],
  };

  const upcomingQuery = {
    platform: platformLower,
    startTime: { $gt: now },
    phase: { $nin: ['CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST', 'FINISHED'] },
  };

  const pastQuery = {
    platform: platformLower,
    $or: [
      { phase: 'FINISHED' },
      {
        startTime: { $lte: now },
        $expr: {
          $lte: [
            { $add: ['$startTime', { $multiply: ['$duration', 1000] }] },
            now,
          ],
        },
        phase: { $nin: ['CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST'] },
      },
    ],
  };
  if (search) {
    pastQuery.$text = { $search: search };
  }

  const [ongoing, upcoming, pastContests, pastTotal] = await Promise.all([
    Contest.find(ongoingQuery).sort({ startTime: 1 }).lean(),
    Contest.find(upcomingQuery).sort({ startTime: 1 }).lean(),
    Contest.find(pastQuery).sort({ startTime: -1 }).skip(pastSkip).limit(pastLimitNum).lean(),
    Contest.countDocuments(pastQuery),
  ]);

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

  const query = { platform: platform.toLowerCase() };
  if (search) {
    query.$text = { $search: search };
  }

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
