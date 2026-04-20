const platformAggregator = require('../services/platformAggregator.service');
const userRepository = require('../repositories/user.repository');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Platform Controller — handles multi-platform profile operations.
 */

/**
 * @route   GET /api/platforms/profile
 * @desc    Fetch aggregated profile data from all connected platforms
 * @access  Private
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await userRepository.findById(req.user.id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const platformHandles = user.platformHandles || {};

  // Check if user has any platform connected
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

  // Aggregate data from all connected platforms
  const result = await platformAggregator.fetchAllProfiles(platformHandles);

  return sendSuccess(res, 200, 'Platform profiles fetched', result);
});

/**
 * @route   POST /api/platforms/connect
 * @desc    Connect / update platform handles for the authenticated user
 * @access  Private
 *
 * Body: { codeforces?: string, leetcode?: string, codechef?: string }
 */
const connectPlatforms = asyncHandler(async (req, res) => {
  const { codeforces, leetcode, codechef } = req.body;

  // At least one handle must be provided
  if (!codeforces && !leetcode && !codechef) {
    throw AppError.badRequest(
      'At least one platform handle must be provided'
    );
  }

  // Build update object — only set provided fields
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

/**
 * @route   GET /api/platforms/status
 * @desc    Check which platforms the user has connected
 * @access  Private
 */
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
