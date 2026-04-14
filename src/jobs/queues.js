const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

// ─── Queue Names ────────────────────────────────────────

const QUEUE_NAMES = {
  SYNC_CONTESTS: 'sync-contests',
  SYNC_USER_RATINGS: 'sync-user-ratings',
  SYNC_ALL_USERS: 'sync-all-users',
};

// ─── Queue Instances ────────────────────────────────────

let queues = {};

/**
 * Initialize all BullMQ queues.
 * Must be called after Redis is available.
 */
const initQueues = () => {
  const connection = getRedisConnection();

  queues = {
    syncContests: new Queue(QUEUE_NAMES.SYNC_CONTESTS, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 50 },  // Keep last 50 completed jobs
        removeOnFail: { count: 100 },     // Keep last 100 failed jobs
      },
    }),

    syncUserRatings: new Queue(QUEUE_NAMES.SYNC_USER_RATINGS, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    }),

    syncAllUsers: new Queue(QUEUE_NAMES.SYNC_ALL_USERS, {
      connection,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 20 },
        removeOnFail: { count: 50 },
      },
    }),
  };

  logger.info('BullMQ queues initialized', { queues: Object.keys(QUEUE_NAMES) });
  return queues;
};

// ─── Job Producers ──────────────────────────────────────

/**
 * Add a contest sync job to the queue.
 * @returns {Promise<Job>}
 */
const addContestSyncJob = async () => {
  if (!queues.syncContests) initQueues();
  const job = await queues.syncContests.add('sync-codeforces-contests', {
    platform: 'codeforces',
    triggeredAt: new Date().toISOString(),
  });
  logger.info(`Contest sync job added: ${job.id}`);
  return job;
};

/**
 * Add a user rating sync job to the queue.
 * @param {string} userId - MongoDB User ID
 * @param {string} handle - Codeforces handle
 * @returns {Promise<Job>}
 */
const addUserRatingSyncJob = async (userId, handle) => {
  if (!queues.syncUserRatings) initQueues();
  const job = await queues.syncUserRatings.add(
    `sync-ratings-${handle}`,
    { userId, handle, platform: 'codeforces', triggeredAt: new Date().toISOString() },
    { jobId: `user-rating-${userId}` } // Deduplicate: one job per user at a time
  );
  logger.info(`User rating sync job added: ${job.id} (${handle})`);
  return job;
};

/**
 * Add a batch sync job for all users.
 * @returns {Promise<Job>}
 */
const addBatchSyncJob = async () => {
  if (!queues.syncAllUsers) initQueues();
  const job = await queues.syncAllUsers.add('sync-all-users', {
    triggeredAt: new Date().toISOString(),
  });
  logger.info(`Batch sync job added: ${job.id}`);
  return job;
};

/**
 * Schedule recurring jobs (cron-based).
 * Call once during server startup.
 */
const scheduleRecurringJobs = async () => {
  if (!queues.syncContests) initQueues();

  // Sync contests every 6 hours
  await queues.syncContests.add(
    'scheduled-contest-sync',
    { platform: 'codeforces', scheduled: true },
    {
      repeat: { pattern: '0 */6 * * *' }, // Every 6 hours
      jobId: 'recurring-contest-sync',
    }
  );

  // Sync all users' ratings every 12 hours
  await queues.syncAllUsers.add(
    'scheduled-all-users-sync',
    { scheduled: true },
    {
      repeat: { pattern: '0 */12 * * *' }, // Every 12 hours
      jobId: 'recurring-all-users-sync',
    }
  );

  logger.info('Recurring jobs scheduled', {
    contestSync: 'Every 6 hours',
    allUsersSync: 'Every 12 hours',
  });
};

/**
 * Close all queues gracefully.
 */
const closeQueues = async () => {
  const queueEntries = Object.entries(queues);
  for (const [name, queue] of queueEntries) {
    await queue.close();
    logger.info(`Queue closed: ${name}`);
  }
  queues = {};
};

module.exports = {
  QUEUE_NAMES,
  initQueues,
  addContestSyncJob,
  addUserRatingSyncJob,
  addBatchSyncJob,
  scheduleRecurringJobs,
  closeQueues,
};
