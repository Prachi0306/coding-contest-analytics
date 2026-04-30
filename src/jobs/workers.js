const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('./queues');
const dataSyncService = require('../services/dataSync.service');
const platformAggregator = require('../services/platformAggregator.service');
const logger = require('../utils/logger');



let workers = [];


const startWorkers = () => {
const UserStats = require('../models/UserStats');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const Contest = require('../models/Contest');

  const persistPlatformData = async (userId, data) => {
    if (data.status === 'failed' || !data.contests || data.contests.length === 0) {
      return 0;
    }
    
    const statsDocs = data.contests.map((entry) => ({
      userId,
      platform: data.platform,
      contestId: String(entry.contestId),
      contestName: entry.contestName || 'Unknown Contest',
      rank: entry.rank || 0,
      oldRating: entry.oldRating || 0,
      newRating: entry.rating || entry.newRating || 0,
      ratingChange: entry.ratingChange || 0,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    }));

    const validStats = statsDocs.filter(stat => stat.contestId);
    if (validStats.length === 0) return 0;

    const result = await UserStats.bulkUpsertStats(validStats);
    return (result.upsertedCount || 0) + (result.modifiedCount || 0);
  };

  const persistUpsolveData = async (userId, data) => {
    if (!data.submissions || data.submissions.length === 0 || data.platform !== 'codeforces') return;

    const contestIds = [...new Set(data.submissions.map(s => String(s.contestId)).filter(Boolean))];
    const contests = await Contest.find({ platform: data.platform, contestId: { $in: contestIds } });
    
    const contestMap = {};
    contests.forEach(c => {
      contestMap[c.contestId] = c._id;
    });

    const problemsMap = new Map();
    const subsMap = new Map();

    for (const sub of data.submissions) {
      if (!sub.problem || !sub.problem.contestId || !sub.problem.index) continue;
      const internalContestId = contestMap[String(sub.problem.contestId)];
      if (!internalContestId) continue;

      const probKey = `${internalContestId}-${sub.problem.index}`;
      if (!problemsMap.has(probKey)) {
        problemsMap.set(probKey, {
          contestId: internalContestId,
          problemId: sub.problem.index,
          name: sub.problem.name || 'Unknown',
          index: sub.problem.index,
          platform: data.platform,
          difficulty: sub.problem.rating ? String(sub.problem.rating) : '',
          url: `https://codeforces.com/contest/${sub.problem.contestId}/problem/${sub.problem.index}`,
        });
      }

      const subKey = `${internalContestId}-${sub.problem.index}`;
      const isSolved = sub.verdict === 'OK';
      const isContestant = sub.participantType === 'CONTESTANT' || sub.participantType === 'OUT_OF_COMPETITION';
      
      const existing = subsMap.get(subKey);
      
      let solvedDuringContest = false;
      let status = 'unsolved';
      let solvedAt = null;

      if (existing) {
        solvedDuringContest = existing.solvedDuringContest || (isSolved && isContestant);
        status = existing.status === 'solved' || isSolved ? 'solved' : 'unsolved';
        solvedAt = isSolved && !existing.solvedAt ? new Date(sub.timestamp) : existing.solvedAt;
      } else {
        solvedDuringContest = isSolved && isContestant;
        status = isSolved ? 'solved' : 'unsolved';
        solvedAt = isSolved ? new Date(sub.timestamp) : null;
      }

      subsMap.set(subKey, {
        userId,
        contestId: internalContestId,
        problemId: sub.problem.index,
        status,
        solvedDuringContest,
        solvedAt,
      });
    }

    if (problemsMap.size > 0) {
      const problemOps = Array.from(problemsMap.values()).map(p => ({
        updateOne: {
          filter: { contestId: p.contestId, problemId: p.problemId, platform: p.platform },
          update: { $set: p },
          upsert: true
        }
      }));
      await Problem.bulkWrite(problemOps, { ordered: false });
    }

    if (subsMap.size > 0) {
      const subOps = Array.from(subsMap.values()).map(s => ({
        updateOne: {
          filter: { userId: s.userId, contestId: s.contestId, problemId: s.problemId },
          update: { $set: s },
          upsert: true
        }
      }));
      await Submission.bulkWrite(subOps, { ordered: false });
    }
  };

  const contestWorker = new Worker(
    QUEUE_NAMES.SYNC_CONTESTS,
    async (job) => {
      logger.info(`[Worker] Processing contest sync job: ${job.id}`, { data: job.data });
      const result = await dataSyncService.syncCodeforcesContests();
      logger.info(`[Worker] Contest sync job complete: ${job.id}`, result);
      return result;
    },
    {
      connection: createRedisConnection('worker-contests'),
      concurrency: 1,
      limiter: { max: 1, duration: 60000 },
    }
  );

  const codeforcesWorker = new Worker(
    QUEUE_NAMES.SYNC_CODEFORCES,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing Codeforces sync: ${job.id}`, { userId, handle });
      
      const data = await platformAggregator.fetchSingleProfile('codeforces', handle);
      if (data.status === 'failed') throw new Error(data.error);

      const savedCount = await persistPlatformData(userId, data);
      await persistUpsolveData(userId, data);
      logger.info(`[Worker] Codeforces sync complete: ${job.id}`, { savedCount });
      return data;
    },
    {
      connection: createRedisConnection('worker-codeforces'),
      concurrency: 2,
      limiter: { max: 5, duration: 10000 },
    }
  );

  const leetcodeWorker = new Worker(
    QUEUE_NAMES.SYNC_LEETCODE,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing LeetCode sync: ${job.id}`, { userId, handle });
      
      const data = await platformAggregator.fetchSingleProfile('leetcode', handle);
      if (data.status === 'failed') throw new Error(data.error);

      const savedCount = await persistPlatformData(userId, data);
      logger.info(`[Worker] LeetCode sync complete: ${job.id}`, { savedCount });
      return data;
    },
    {
      connection: createRedisConnection('worker-leetcode'),
      concurrency: 2,
    }
  );

  const codechefWorker = new Worker(
    QUEUE_NAMES.SYNC_CODECHEF,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing CodeChef sync: ${job.id}`, { userId, handle });
      
      const data = await platformAggregator.fetchSingleProfile('codechef', handle);
      if (data.status === 'failed') throw new Error(data.error);

      const savedCount = await persistPlatformData(userId, data);
      logger.info(`[Worker] CodeChef sync complete: ${job.id}`, { savedCount });
      return data;
    },
    {
      connection: createRedisConnection('worker-codechef'),
      concurrency: 2,
    }
  );

  const batchSyncWorker = new Worker(
    QUEUE_NAMES.SYNC_ALL_USERS,
    async (job) => {
      logger.info(`[Worker] Processing batch sync job: ${job.id}`);
      const result = await dataSyncService.syncAllUsers();
      logger.info(`[Worker] Batch sync complete: ${job.id}`, {
        synced: result.synced,
        failed: result.failed,
        total: result.totalUsers,
      });
      return result;
    },
    {
      connection: createRedisConnection('worker-batch-sync'),
      concurrency: 1,
    }
  );

  const attachEvents = (worker, name) => {
    worker.on('completed', (job, result) => {
      logger.info(`[${name}] Job ${job.id} completed`, {
        duration: `${Date.now() - job.timestamp}ms`,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error(`[${name}] Job ${job?.id} failed`, {
        error: err.message,
        attemptsMade: job?.attemptsMade,
        maxAttempts: job?.opts?.attempts,
      });
    });

    worker.on('error', (err) => {
      logger.error(`[${name}] Worker error: ${err.message}`);
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`[${name}] Job ${jobId} stalled`);
    });
  };

  attachEvents(contestWorker, 'ContestSync');
  attachEvents(codeforcesWorker, 'CodeforcesSync');
  attachEvents(leetcodeWorker, 'LeetCodeSync');
  attachEvents(codechefWorker, 'CodeChefSync');
  attachEvents(batchSyncWorker, 'BatchSync');

  workers = [contestWorker, codeforcesWorker, leetcodeWorker, codechefWorker, batchSyncWorker];

  logger.info('BullMQ workers started correctly', {
    workers: workers.map(w => w.name),
  });

  return workers;
};


const stopWorkers = async () => {
  for (const worker of workers) {
    await worker.close();
    logger.info(`Worker closed: ${worker.name}`);
  }
  workers = [];
};

module.exports = {
  startWorkers,
  stopWorkers,
};
