const dataSyncService = require('../services/dataSync.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');




const syncContests = asyncHandler(async (req, res) => {
  const result = await dataSyncService.syncCodeforcesContests();

  return sendSuccess(res, 200, 'Contest sync complete', result);
});

const userRepository = require('../repositories/user.repository');
const { addPlatformSyncJob } = require('../jobs/queues');
const AppError = require('../utils/AppError');


const syncMyRatings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await userRepository.findById(userId);
  
  if (!user) {
    throw AppError.notFound('User not found');
  }

  const handles = {
    codeforces: user.platformHandles?.codeforces || user.handles?.codeforces,
    leetcode: user.platformHandles?.leetcode || user.handles?.leetcode,
    codechef: user.platformHandles?.codechef || user.handles?.codechef,
  };

  const queuedPlatforms = [];

  const platformAggregator = require('../services/platformAggregator.service');
  const UserStats = require('../models/UserStats');

  for (const [platform, handle] of Object.entries(handles)) {
    if (handle) {
      try {
        await addPlatformSyncJob(userId, platform, handle);
        queuedPlatforms.push(platform);
      } catch (err) {
        const data = await platformAggregator.fetchSingleProfile(platform, handle);
        if (data.status !== 'failed' && data.contests && data.contests.length > 0) {
          const statsDocs = data.contests.map((entry) => ({
            userId,
            platform: data.platform,
            contestId: String(entry.contestId),
            contestName: entry.contestName || 'Unknown Contest',
            rank: entry.rank || 0,
            oldRating: entry.oldRating || 0,
            newRating: entry.rating || entry.newRating || 0,
            ratingChange: entry.ratingChange || 0,
            timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
          })).filter(stat => stat.contestId);
          
          if (statsDocs.length > 0) {
            await UserStats.bulkUpsertStats(statsDocs);
          }
        }
        queuedPlatforms.push(platform);
      }
    }
  }

  if (queuedPlatforms.length === 0) {
    throw AppError.badRequest('No platform handles configured to sync.');
  }

  return sendSuccess(res, 202, 'Data sync jobs enqueued successfully', {
    queuedPlatforms,
    message: 'Sync is running in the background. Please refresh the page in a few moments.'
  });
});

module.exports = {
  syncContests,
  syncMyRatings,
};
