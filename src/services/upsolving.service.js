const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');


class UpsolvingService {

  async getUpsolveList(userId, contestId) {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw AppError.notFound('Contest not found');
    }

    const problems = await Problem.find({ contestId }).sort({ index: 1 });

    const submissions = await Submission.find({ userId, contestId });

    const submissionMap = {};
    submissions.forEach((sub) => {
      submissionMap[sub.problemId] = sub;
    });

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


  async updateSolveStatus(userId, contestId, problemId, status, solvedDuringContest = false) {
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
