const platformAggregator = require('../services/platformAggregator.service');
const userRepository = require('../repositories/user.repository');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');




const getProfile = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user.id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const platformHandles = user.platformHandles || {};

  const hasAnyHandle = Object.values(platformHandles).some(
    (h) => h && h.trim()
  );

  if (!hasAnyHandle) {
    return sendSuccess(res, 200, 'No platforms connected', {
      platforms: [],
      failedPlatforms: [],
      summary: { total: 0, success: 0, failed: 0 },
    });
  }

  const result = await platformAggregator.fetchAllProfiles(platformHandles);

  return sendSuccess(res, 200, 'Platform profiles fetched', result);
});


const connectPlatforms = asyncHandler(async (req, res) => {
  const { codeforces, leetcode, codechef } = req.body;

  if (!codeforces && !leetcode && !codechef) {
    throw AppError.badRequest(
      'At least one platform handle must be provided'
    );
  }

  const updates = {};
  if (codeforces !== undefined) updates.codeforces = codeforces.trim();
  if (leetcode !== undefined) updates.leetcode = leetcode.trim();
  if (codechef !== undefined) updates.codechef = codechef.trim();

  const updatedUser = await userRepository.updatePlatformHandles(
    req.user.id,
    updates
  );

  if (!updatedUser) {
    throw AppError.notFound('User not found');
  }

  logger.info(`Platform handles updated for user ${req.user.id}`, {
    platforms: Object.keys(updates),
  });

  return sendSuccess(res, 200, 'Platform handles updated', {
    platformHandles: updatedUser.platformHandles,
  });
});


const getConnectionStatus = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user.id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const platformHandles = user.platformHandles || {};

  const status = {
    codeforces: {
      connected: !!(platformHandles.codeforces && platformHandles.codeforces.trim()),
      handle: platformHandles.codeforces || '',
    },
    leetcode: {
      connected: !!(platformHandles.leetcode && platformHandles.leetcode.trim()),
      handle: platformHandles.leetcode || '',
    },
    codechef: {
      connected: !!(platformHandles.codechef && platformHandles.codechef.trim()),
      handle: platformHandles.codechef || '',
    },
  };

  return sendSuccess(res, 200, 'Platform connection status', { status });
});

module.exports = {
  getProfile,
  connectPlatforms,
  getConnectionStatus,
};
