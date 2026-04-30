const bookmarkService = require('../services/bookmark.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');




const addBookmark = asyncHandler(async (req, res) => {
  const { contestId } = req.body;
  const bookmark = await bookmarkService.addBookmark(req.user.id, contestId);
  return sendSuccess(res, 201, 'Contest added to your schedule', { bookmark });
});


const removeBookmark = asyncHandler(async (req, res) => {
  const { contestId } = req.body;
  await bookmarkService.removeBookmark(req.user.id, contestId);
  return sendSuccess(res, 200, 'Contest removed from your schedule', null);
});


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
