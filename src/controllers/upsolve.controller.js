const upsolvingService = require('../services/upsolving.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Upsolving Controller — handles upsolve tracker endpoints.
 */

/**
 * @route   GET /api/upsolve/:contestId
 * @desc    Get upsolve list for a contest (solved, unsolved, upsolved)
 * @access  Private
 */
const getUpsolveList = asyncHandler(async (req, res) => {
  const { contestId } = req.params;
  const result = await upsolvingService.getUpsolveList(req.user.id, contestId);
  return sendSuccess(res, 200, 'Upsolve list retrieved', result);
});

/**
 * @route   PUT /api/upsolve/:contestId/:problemId
 * @desc    Update solve status of a problem
 * @access  Private
 */
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

/**
 * @route   GET /api/upsolve/stats
 * @desc    Get aggregate upsolving stats for the user
 * @access  Private
 */
const getUpsolveStats = asyncHandler(async (req, res) => {
  const stats = await upsolvingService.getUserUpsolveStats(req.user.id);
  return sendSuccess(res, 200, 'Upsolve stats retrieved', stats);
});

/**
 * @route   GET /api/upsolve/contests
 * @desc    Get list of contests that have problems (for filter dropdown)
 * @access  Private
 */
const getContestsWithProblems = asyncHandler(async (req, res) => {
  const contests = await upsolvingService.getContestsWithProblems(req.user.id);
  return sendSuccess(res, 200, 'Contests with problems retrieved', { contests });
});

module.exports = {
  getUpsolveList,
  updateSolveStatus,
  getUpsolveStats,
  getContestsWithProblems,
};
