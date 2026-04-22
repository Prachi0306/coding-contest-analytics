const bookmarkService = require('../services/bookmark.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Schedule Controller — handles bookmarked contests (My Schedule).
 */

/**
 * @route   POST /api/schedule/star
 * @desc    Add a contest to the user's schedule
 * @access  Private
 */
const addBookmark = asyncHandler(async (req, res) => {
  const { contestId } = req.body;
  const bookmark = await bookmarkService.addBookmark(req.user.id, contestId);
  return sendSuccess(res, 201, 'Contest added to your schedule', { bookmark });
});

/**
 * @route   DELETE /api/schedule/unstar
 * @desc    Remove a contest from the user's schedule
 * @access  Private
 */
const removeBookmark = asyncHandler(async (req, res) => {
  const { contestId } = req.body;
  await bookmarkService.removeBookmark(req.user.id, contestId);
  return sendSuccess(res, 200, 'Contest removed from your schedule', null);
});

/**
 * @route   GET /api/schedule
 * @desc    Get user's complete schedule sorted by start time
 * @access  Private
 */
const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await bookmarkService.getUserSchedule(req.user.id);
  return sendSuccess(res, 200, 'Schedule retrieved', {
    total: schedule.length,
    contests: schedule,
  });
});

module.exports = {
  addBookmark,
  removeBookmark,
  getSchedule,
};
