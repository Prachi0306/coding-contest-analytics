const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * Upsolving Service — manages the upsolving tracker logic.
 *
 * Provides methods to:
 *   - Get a user's upsolve list for a specific contest
 *   - Update a problem's solve status
 *   - Get aggregate upsolving stats
 */
class UpsolvingService {
  /**
   * Get the upsolve list for a user in a specific contest.
   * Returns all problems for the contest, each annotated with
   * the user's solve status.
   *
   * @param {string} userId - MongoDB ObjectId of the user
   * @param {string} contestId - MongoDB ObjectId of the contest
   * @returns {Promise<object>} { contest, solvedDuringContest, unsolved, upsolvedAfter, totalProblems }
   */
  async getUpsolveList(userId, contestId) {
    // 1. Verify contest exists
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw AppError.notFound('Contest not found');
    }

    // 2. Get all problems for this contest
    const problems = await Problem.find({ contestId }).sort({ index: 1 });

    // 3. Get user's submissions for this contest
    const submissions = await Submission.find({ userId, contestId });

    // 4. Create a lookup map for quick access
    const submissionMap = {};
    submissions.forEach((sub) => {
      submissionMap[sub.problemId] = sub;
    });

    // 5. Categorize problems
    const solvedDuringContest = [];
    const upsolvedAfter = [];
    const unsolved = [];

    problems.forEach((problem) => {
      const submission = submissionMap[problem.problemId];
      const problemData = {
        _id: problem._id,
        problemId: problem.problemId,
        name: problem.name,
        index: problem.index,
        platform: problem.platform,
        difficulty: problem.difficulty,
        url: problem.url,
      };

      if (submission && submission.status === 'solved') {
        if (submission.solvedDuringContest) {
          solvedDuringContest.push({
            ...problemData,
            solvedAt: submission.solvedAt,
            solvedDuringContest: true,
          });
        } else {
          upsolvedAfter.push({
            ...problemData,
            solvedAt: submission.solvedAt,
            solvedDuringContest: false,
          });
        }
      } else {
        unsolved.push(problemData);
      }
    });

    return {
      contest: {
        _id: contest._id,
        name: contest.name,
        platform: contest.platform,
        startTime: contest.startTime,
        duration: contest.duration,
      },
      totalProblems: problems.length,
      solvedDuringContest,
      upsolvedAfter,
      unsolved,
    };
  }

  /**
   * Update the solve status of a problem for a user.
   * Idempotent — upserts the submission.
   *
   * @param {string} userId
   * @param {string} contestId
   * @param {string} problemId
   * @param {string} status - 'solved' or 'unsolved'
   * @param {boolean} solvedDuringContest
   * @returns {Promise<object>} The updated submission
   */
  async updateSolveStatus(userId, contestId, problemId, status, solvedDuringContest = false) {
    // Verify the problem exists
    const problem = await Problem.findOne({ contestId, problemId });
    if (!problem) {
      throw AppError.notFound('Problem not found for this contest');
    }

    const submission = await Submission.findOneAndUpdate(
      { userId, contestId, problemId },
      {
        $set: {
          status,
          solvedDuringContest,
          solvedAt: status === 'solved' ? new Date() : null,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    logger.info(`User ${userId} marked problem ${problemId} as ${status} for contest ${contestId}`);
    return submission;
  }

  /**
   * Get aggregate upsolving stats for a user across all contests.
   *
   * @param {string} userId
   * @returns {Promise<object>} { totalContests, totalSolvedDuringContest, totalUpsolved, totalUnsolved }
   */
  async getUserUpsolveStats(userId) {
    const objectIdUser = new mongoose.Types.ObjectId(userId);

    const stats = await Submission.aggregate([
      { $match: { userId: objectIdUser } },
      {
        $group: {
          _id: null,
          totalSolvedDuringContest: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'solved'] }, '$solvedDuringContest'] }, 1, 0] },
          },
          totalUpsolved: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'solved'] }, { $not: '$solvedDuringContest' }] }, 1, 0] },
          },
          totalUnsolved: {
            $sum: { $cond: [{ $eq: ['$status', 'unsolved'] }, 1, 0] },
          },
          contestIds: { $addToSet: '$contestId' },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalContests: 0,
        totalSolvedDuringContest: 0,
        totalUpsolved: 0,
        totalUnsolved: 0,
      };
    }

    return {
      totalContests: stats[0].contestIds.length,
      totalSolvedDuringContest: stats[0].totalSolvedDuringContest,
      totalUpsolved: stats[0].totalUpsolved,
      totalUnsolved: stats[0].totalUnsolved,
    };
  }

  /**
   * Get contests that have problems registered (for the filter dropdown).
   *
   * @param {string} userId
   * @returns {Promise<Array>} Array of contests with problem counts
   */
  async getContestsWithProblems(userId) {
    const objectIdUser = new mongoose.Types.ObjectId(userId);

    const contests = await Problem.aggregate([
      {
        $group: {
          _id: '$contestId',
          platform: { $first: '$platform' },
          totalProblems: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'contests',
          localField: '_id',
          foreignField: '_id',
          as: 'contest',
        },
      },
      { $unwind: '$contest' },
      { $sort: { 'contest.startTime': -1 } },
      {
        $project: {
          _id: '$contest._id',
          name: '$contest.name',
          platform: '$contest.platform',
          startTime: '$contest.startTime',
          totalProblems: 1,
        },
      },
    ]);

    return contests;
  }
}

module.exports = new UpsolvingService();
