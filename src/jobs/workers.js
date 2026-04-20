const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('./queues');
const dataSyncService = require('../services/dataSync.service');
const platformAggregator = require('../services/platformAggregator.service');
const logger = require('../utils/logger');

/**
 * BullMQ Workers.
 *
 * Each worker processes jobs from a specific queue.
 * Workers use their own Redis connections (BullMQ best practice).
 */

let workers = [];

/**
 * Create and start all workers.
 * Call once during server startup.
 */
const startWorkers = () => {
  // ─── Contest Sync Worker (Codeforces only standard contests) ─
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
      concurrency: 1, // One contest sync at a time
      limiter: {
        max: 1,
        duration: 60000, // Max 1 job per minute (rate limit)
      },
    }
  );

  // ─── Codeforces Sync Worker ───────────────────────
  const codeforcesWorker = new Worker(
    QUEUE_NAMES.SYNC_CODEFORCES,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing Codeforces sync: ${job.id}`, { userId, handle });
      
      // Phase D prep: in the future this syncs to UserStats 
      // For now we can keep the existing codebase working by using dataSyncService
      const result = await dataSyncService.syncUserRatingHistory(userId, handle);
      
      logger.info(`[Worker] Codeforces sync complete: ${job.id}`, result);
      return result;
    },
    {
      connection: createRedisConnection('worker-codeforces'),
      concurrency: 2,
      limiter: { max: 5, duration: 10000 },
    }
  );

  // ─── LeetCode Sync Worker ─────────────────────────
  const leetcodeWorker = new Worker(
    QUEUE_NAMES.SYNC_LEETCODE,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing LeetCode sync: ${job.id}`, { userId, handle });
      
      // Currently just fetching to warm up cache / log status
      // (Writes to UserStats will be added in Phase D Task 15)
      const data = await platformAggregator.fetchSingleProfile('leetcode', handle);
      if (data.status === 'failed') throw new Error(data.error);

      logger.info(`[Worker] LeetCode sync complete: ${job.id}`);
      return data;
    },
    {
      connection: createRedisConnection('worker-leetcode'),
      concurrency: 2,
    }
  );

  // ─── CodeChef Sync Worker ─────────────────────────
  const codechefWorker = new Worker(
    QUEUE_NAMES.SYNC_CODECHEF,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing CodeChef sync: ${job.id}`, { userId, handle });
      
      // (Writes to UserStats will be added in Phase D Task 15)
      const data = await platformAggregator.fetchSingleProfile('codechef', handle);
      if (data.status === 'failed') throw new Error(data.error);

      logger.info(`[Worker] CodeChef sync complete: ${job.id}`);
      return data;
    },
    {
      connection: createRedisConnection('worker-codechef'),
      concurrency: 2,
    }
  );

  // ─── Batch Sync Worker ────────────────────────────
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
      concurrency: 1, // Only one batch sync at a time
    }
  );

  // ─── Event Handlers ───────────────────────────────
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

/**
 * Stop all workers gracefully.
 */
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
