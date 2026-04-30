const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('./queues');
const dataSyncService = require('../services/dataSync.service');
const platformAggregator = require('../services/platformAggregator.service');
const logger = require('../utils/logger');



let workers = [];


const startWorkers = () => {
const UserStats = require('../models/UserStats');

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
