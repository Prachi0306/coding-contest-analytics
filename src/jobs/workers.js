const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { QUEUE_NAMES } = require('./queues');
const dataSyncService = require('../services/dataSync.service');
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
  // ─── Contest Sync Worker ──────────────────────────
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

  // ─── User Rating Sync Worker ──────────────────────
  const userRatingWorker = new Worker(
    QUEUE_NAMES.SYNC_USER_RATINGS,
    async (job) => {
      const { userId, handle } = job.data;
      logger.info(`[Worker] Processing user rating sync: ${job.id}`, { userId, handle });

      const result = await dataSyncService.syncUserRatingHistory(userId, handle);

      logger.info(`[Worker] User rating sync complete: ${job.id}`, result);
      return result;
    },
    {
      connection: createRedisConnection('worker-user-ratings'),
      concurrency: 2, // Process 2 user syncs in parallel
      limiter: {
        max: 5,
        duration: 10000, // Max 5 jobs per 10 seconds (rate limit for Codeforces API)
      },
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
  attachEvents(userRatingWorker, 'UserRatingSync');
  attachEvents(batchSyncWorker, 'BatchSync');

  workers = [contestWorker, userRatingWorker, batchSyncWorker];

  logger.info('BullMQ workers started', {
    workers: [
      `${QUEUE_NAMES.SYNC_CONTESTS} (concurrency: 1)`,
      `${QUEUE_NAMES.SYNC_USER_RATINGS} (concurrency: 2)`,
      `${QUEUE_NAMES.SYNC_ALL_USERS} (concurrency: 1)`,
    ],
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
