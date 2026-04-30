const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const User = require('../models/User');
const codeforcesService = require('./codeforces.service');
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

    const contests = await Submission.aggregate([
      { $match: { userId: objectIdUser } },
      {
        $group: {
          _id: '$contestId',
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
          contestId: '$contest.contestId',
          name: '$contest.name',
          platform: '$contest.platform',
          startTime: '$contest.startTime',
          totalProblems: 1,
        },
      },
    ]);

    return contests;
  }
  async syncContestProblems(userId, platform, externalContestId) {
    if (platform !== 'codeforces') {
      throw AppError.badRequest('Manual contest sync is currently only supported for Codeforces');
    }

    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const handle = user.platformHandles?.codeforces || user.handles?.codeforces;
    if (!handle) throw AppError.badRequest('No Codeforces handle configured');

    // The user requested to track ONE contest at a time.
    // Clear any previous Codeforces submissions before syncing this one.
    const codeforcesContests = await Contest.find({ platform: 'codeforces' }).select('_id');
    const cfContestIds = codeforcesContests.map(c => c._id);
    await Submission.deleteMany({ userId: user._id, contestId: { $in: cfContestIds } });

    const data = await codeforcesService.getContestDetailsAndProblems(externalContestId);
    if (!data || !data.problems || data.problems.length === 0) {
      throw AppError.badRequest('No problems found for this contest');
    }

    const contestDoc = {
      platform: 'codeforces',
      contestId: String(externalContestId),
      name: data.contest.name,
      type: data.contest.type || 'OTHER',
      phase: data.contest.phase || 'FINISHED',
      startTime: data.contest.startTime ? new Date(data.contest.startTime) : new Date(),
      duration: data.contest.duration || 0,
    };

    const contest = await Contest.findOneAndUpdate(
      { platform: 'codeforces', contestId: String(externalContestId) },
      { $set: contestDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const problemOps = data.problems.map(p => ({
      updateOne: {
        filter: { contestId: contest._id, problemId: String(p.index), platform: 'codeforces' },
        update: {
          $set: {
            contestId: contest._id,
            problemId: String(p.index),
            name: p.name || 'Unknown',
            index: String(p.index),
            platform: 'codeforces',
            difficulty: p.rating ? String(p.rating) : '',
            url: `https://codeforces.com/contest/${externalContestId}/problem/${p.index}`,
          }
        },
        upsert: true
      }
    }));

    if (problemOps.length > 0) {
      await Problem.bulkWrite(problemOps, { ordered: false });
    }

    let userSubmissions = [];
    try {
      userSubmissions = await codeforcesService.getUserContestSubmissions(externalContestId, handle);
    } catch (err) {
      logger.warn(`Failed to fetch contest submissions for user ${handle}: ${err.message}`);
    }

    const solvedProblems = new Map();
    userSubmissions.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem?.index) {
        const isDuringContest = ['CONTESTANT', 'OUT_OF_COMPETITION', 'VIRTUAL'].includes(sub.participantType);
        const current = solvedProblems.get(sub.problem.index);
        if (!current || !current.solvedDuringContest) {
          solvedProblems.set(sub.problem.index, {
            solvedDuringContest: isDuringContest,
            timestamp: sub.timestamp,
          });
        }
      }
    });

    const submissionOps = data.problems.map(p => {
      const solvedData = solvedProblems.get(String(p.index));
      const updateDoc = {
        $setOnInsert: {
          userId: user._id,
          contestId: contest._id,
          problemId: String(p.index),
        }
      };

      if (solvedData) {
        updateDoc.$set = {
          status: 'solved',
          solvedDuringContest: solvedData.solvedDuringContest,
          solvedAt: new Date(solvedData.timestamp),
        };
      } else {
        updateDoc.$setOnInsert.status = 'unsolved';
        updateDoc.$setOnInsert.solvedDuringContest = false;
      }

      return {
        updateOne: {
          filter: { userId: user._id, contestId: contest._id, problemId: String(p.index) },
          update: updateDoc,
          upsert: true
        }
      };
    });

    if (submissionOps.length > 0) {
      await Submission.bulkWrite(submissionOps, { ordered: false });
    }

    return { success: true, problemsAdded: problemOps.length };
  }
}

module.exports = new UpsolvingService();
