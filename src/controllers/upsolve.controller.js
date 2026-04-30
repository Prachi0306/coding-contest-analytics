const upsolvingService = require('../services/upsolving.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');




const getUpsolveList = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const result = await upsolvingService.getUpsolveList(req.user.id, contestId);
  return sendSuccess(res, 200, 'Upsolve list retrieved', result);
});


const updateSolveStatus = asyncHandler(async (req, res) => {
  const { contestId, problemId } = req.params;
  const { status, solvedDuringContest } = req.body;
  const submission = await upsolvingService.updateSolveStatus(
    req.user.id,
    contestId,
    problemId,
    status,
    solvedDuringContest || false
  );
  return sendSuccess(res, 200, 'Solve status updated', { submission });
});


const getUpsolveStats = asyncHandler(async (req, res) => {
  const stats = await upsolvingService.getUserUpsolveStats(req.user.id);
  return sendSuccess(res, 200, 'Upsolve stats retrieved', stats);
});


const getContestsWithProblems = asyncHandler(async (req, res) => {
  const contests = await upsolvingService.getContestsWithProblems(req.user.id);
  return sendSuccess(res, 200, 'Contests with problems retrieved', { contests });
});

const syncContestProblems = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const result = await upsolvingService.syncContestProblems(req.user.id, 'codeforces', contestId);
  return sendSuccess(res, 200, 'Contest problems synced successfully', result);
});

module.exports = {
  getUpsolveList,
  updateSolveStatus,
  getUpsolveStats,
  getContestsWithProblems,
  syncContestProblems,
};
