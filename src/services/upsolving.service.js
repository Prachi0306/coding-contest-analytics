const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const User = require('../models/User');
const codeforcesService = require('./platforms/codeforces.service');
const codechefService = require('./platforms/codechef.service');
const leetcodeService = require('./platforms/leetcode.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class UpsolvingService {

  async getUpsolveList(userId, contestId) {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw AppError.notFound('Contest not found');
    }

    if (contest.platform === 'leetcode') {
      return {
        available: false,
        reason: "LeetCode does not expose a public API to fetch a user's submission history for a specific past contest. Contest rankings are protected by Cloudflare.",
      };
    }

    if (contest.platform === 'codechef') {
      return {
        available: false,
        reason: "CodeChef's contest submissions API is protected by Cloudflare and cannot be fetched server-side.",
      };
    }

    const now = new Date();
    const endTime = new Date(contest.startTime.getTime() + (contest.duration * 1000));
    
    const problems = await Problem.find({ contestId }).sort({ index: 1 });
    const submissions = await Submission.find({ userId, contestId }).sort({ timestamp: 1 });

    const participated = submissions.some(sub => sub.isDuringContest);
    
    if (!participated) {
      return {
        available: true,
        participated: false,
        contest: {
          _id: contest._id,
          name: contest.name,
          platform: contest.platform,
          startTime: contest.startTime,
          duration: contest.duration,
        }
      };
    }

    const submissionGroups = {};
    submissions.forEach((sub) => {
      if (new Date(sub.timestamp) < contest.startTime) return; // Do not count submissions before contest started
      if (!submissionGroups[sub.problemId]) {
        submissionGroups[sub.problemId] = [];
      }
      submissionGroups[sub.problemId].push(sub);
    });

    const solvedDuringContest = [];
    const upsolvedAfter = [];
    const unsolved = [];
    const unattempted = [];

    let totalAttempts = 0;

    problems.forEach((problem) => {
      const subs = submissionGroups[problem.problemId] || [];
      const attempts = subs.length;
      totalAttempts += attempts;
      
      const problemData = {
        _id: problem._id,
        problemId: problem.problemId,
        name: problem.name,
        index: problem.index,
        platform: problem.platform,
        difficulty: problem.difficulty,
        url: problem.url,
        attempts,
      };

      if (attempts === 0) {
        unattempted.push(problemData);
        return;
      }

      let solvedDuring = false;
      let solvedAfter = false;
      let firstSolvedAt = null;

      for (const sub of subs) {
        if (sub.verdict === 'OK' || sub.verdict === 'AC') {
          if (!firstSolvedAt) firstSolvedAt = sub.timestamp;
          // Valid during-contest submission: timestamp <= endTime AND isDuringContest participant type
          if (new Date(sub.timestamp) <= endTime && sub.isDuringContest) {
            solvedDuring = true;
          } else {
            solvedAfter = true;
          }
        }
      }

      problemData.solvedAt = firstSolvedAt;

      // Solved during always takes precedence, even if AC later
      if (solvedDuring) {
        solvedDuringContest.push({ ...problemData, solvedDuringContest: true });
      } else if (solvedAfter) {
        upsolvedAfter.push({ ...problemData, solvedDuringContest: false });
      } else {
        unsolved.push(problemData);
      }
    });

    return {
      available: true,
      participated: true,
      contest: {
        _id: contest._id,
        name: contest.name,
        platform: contest.platform,
        startTime: contest.startTime,
        duration: contest.duration,
      },
      totalProblems: problems.length,
      totalAttempts,
      solvedDuringContest,
      upsolvedAfter,
      unsolved,
      unattempted,
    };
  }


  async updateSolveStatus(userId, contestId, problemId, status, solvedDuringContest = false) {
    const problem = await Problem.findOne({ contestId, problemId });
    if (!problem) {
      throw AppError.notFound('Problem not found for this contest');
    }

    const submission = await Submission.create({
      userId,
      contestId,
      problemId,
      verdict: status === 'solved' ? 'OK' : 'MANUAL_UNSOLVED',
      isDuringContest: solvedDuringContest,
      timestamp: new Date()
    });

    logger.info(`User ${userId} marked problem ${problemId} as ${status} for contest ${contestId}`);
    return submission;
  }


  async getUserUpsolveStats(userId) {
    const objectIdUser = new mongoose.Types.ObjectId(userId);

    const stats = await Submission.aggregate([
      { $match: { userId: objectIdUser } },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: { contestId: '$contestId', problemId: '$problemId' },
          submissions: { $push: '$$ROOT' }
        }
      },
      {
        $project: {
          contestId: '$_id.contestId',
          problemId: '$_id.problemId',
          solvedDuringContest: {
            $gt: [{
              $size: {
                $filter: {
                  input: '$submissions',
                  as: 'sub',
                  cond: { $and: [ { $in: ['$$sub.verdict', ['OK', 'AC']] }, '$$sub.isDuringContest' ] }
                }
              }
            }, 0]
          },
          upsolvedAfter: {
            $gt: [{
              $size: {
                $filter: {
                  input: '$submissions',
                  as: 'sub',
                  cond: { $and: [ { $in: ['$$sub.verdict', ['OK', 'AC']] }, { $not: '$$sub.isDuringContest' } ] }
                }
              }
            }, 0]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSolvedDuringContest: {
            $sum: { $cond: ['$solvedDuringContest', 1, 0] }
          },
          totalUpsolved: {
            $sum: { $cond: [{ $and: [{ $not: '$solvedDuringContest' }, '$upsolvedAfter'] }, 1, 0] }
          },
          totalUnsolved: {
            $sum: { $cond: [{ $and: [{ $not: '$solvedDuringContest' }, { $not: '$upsolvedAfter' }] }, 1, 0] }
          },
          contestIds: { $addToSet: '$contestId' }
        }
      }
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
  async syncContestProblems(userId, platform = 'codeforces', externalContestId) {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    const plat = (platform || 'codeforces').toLowerCase();

    let contest = await Contest.findOne({
      platform: plat,
      contestId: String(externalContestId),
    });

    if (contest) {
      const endTime = new Date(contest.startTime.getTime() + (contest.duration * 1000));
      if (new Date() < endTime) {
        throw AppError.badRequest('This contest has not ended yet. Upsolve is available for past contests only.');
      }
    }

    if (plat === 'codeforces' || plat === 'codechef' || plat === 'leetcode') {
      let handle;
      let serviceAdapter;
      
      if (plat === 'codeforces') {
        handle = user.platformHandles?.codeforces || user.handles?.codeforces;
        serviceAdapter = codeforcesService;
        if (!handle) throw AppError.badRequest('No Codeforces handle configured. Please add one in Settings.');
      } else if (plat === 'codechef') {
        handle = user.platformHandles?.codechef || user.handles?.codechef;
        serviceAdapter = codechefService;
        if (!handle) throw AppError.badRequest('No CodeChef handle configured. Please add one in Settings.');
      } else if (plat === 'leetcode') {
        handle = user.platformHandles?.leetcode || user.handles?.leetcode;
        serviceAdapter = leetcodeService;
        if (!handle) throw AppError.badRequest('No LeetCode handle configured. Please add one in Settings.');
      }

      const data = await serviceAdapter.getContestDetailsAndProblems(externalContestId);
      
      // Secondary check in case the contest was not found in DB
      const startTime = data.contest.startTime ? new Date(data.contest.startTime) : new Date();
      const duration = data.contest.duration || 0;
      const endTime = new Date(startTime.getTime() + (duration * 1000));
      if (new Date() < endTime) {
        throw AppError.badRequest('This contest has not ended yet. Upsolve is available for past contests only.');
      }
      if (!data || !data.problems || data.problems.length === 0) {
        throw AppError.badRequest('No problems found for this contest');
      }

      const contestDoc = {
        platform: plat,
        contestId: String(externalContestId),
        name: data.contest.name,
        type: data.contest.type || 'OTHER',
        phase: data.contest.phase || 'FINISHED',
        startTime: data.contest.startTime ? new Date(data.contest.startTime) : new Date(),
        duration: data.contest.duration || 0,
      };

      contest = await Contest.findOneAndUpdate(
        { platform: plat, contestId: String(externalContestId) },
        { $set: contestDoc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const problemOps = data.problems.map(p => {
        let problemUrl = '';
        if (plat === 'codeforces') problemUrl = `https://codeforces.com/contest/${externalContestId}/problem/${p.index}`;
        else if (plat === 'codechef') problemUrl = `https://www.codechef.com/${externalContestId}/problems/${p.index}`;
        else if (plat === 'leetcode') problemUrl = `https://leetcode.com/problems/${p.name}/`;

        return {
          updateOne: {
            filter: { contestId: contest._id, problemId: String(p.index), platform: plat },
            update: {
              $set: {
                contestId: contest._id,
                problemId: String(p.index),
                name: p.name || 'Unknown',
                index: String(p.index),
                platform: plat,
                difficulty: p.rating ? String(p.rating) : '',
                url: problemUrl,
              }
            },
            upsert: true
          }
        };
      });

      if (problemOps.length > 0) {
        await Problem.bulkWrite(problemOps, { ordered: false });
      }

      let userSubmissions = [];
      try {
        if (serviceAdapter.getUserContestSubmissions) {
          userSubmissions = await serviceAdapter.getUserContestSubmissions(externalContestId, handle);
        }
      } catch (err) {
        logger.warn(`Failed to fetch contest submissions for user ${handle}: ${err.message}`);
      }

      const submissionOps = userSubmissions.map(sub => {
        if (!sub.problem?.index) return null;
        
        return {
          updateOne: {
            filter: { 
              userId: user._id, 
              contestId: contest._id, 
              externalSubmissionId: String(sub.submissionId) 
            },
            update: {
              $set: {
                userId: user._id,
                contestId: contest._id,
                externalSubmissionId: String(sub.submissionId),
                problemId: String(sub.problem.index),
                verdict: sub.verdict,
                isDuringContest: ['CONTESTANT', 'OUT_OF_COMPETITION', 'VIRTUAL'].includes(sub.participantType),
                timestamp: sub.timestamp ? new Date(sub.timestamp) : new Date(),
              }
            },
            upsert: true
          }
        };
      }).filter(Boolean);

      if (submissionOps.length > 0) {
        await Submission.bulkWrite(submissionOps, { ordered: false });
      }

      return { 
        success: true, 
        problemsAdded: problemOps.length, 
        contestId: contest._id,
        contest: {
          _id: contest._id,
          contestId: contest.contestId,
          name: contest.name,
          platform: contest.platform,
          startTime: contest.startTime,
          totalProblems: problemOps.length
        }
      };
    } else {
      throw AppError.badRequest(`Unsupported platform: ${platform}`);
    }
  }
}

module.exports = new UpsolvingService();
