const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

// ─── Queue Names ────────────────────────────────────────

const QUEUE_NAMES = {
  SYNC_CONTESTS: 'sync-contests',
  SYNC_CODEFORCES: 'sync-codeforces',
  SYNC_LEETCODE: 'sync-leetcode',
  SYNC_CODECHEF: 'sync-codechef',
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

  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  };

  queues = {
    syncContests: new Queue(QUEUE_NAMES.SYNC_CONTESTS, {
      connection,
      defaultJobOptions: {
        ...defaultJobOptions,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),

    syncCodeforces: new Queue(QUEUE_NAMES.SYNC_CODEFORCES, {
      connection,
      defaultJobOptions,
    }),

    syncLeetcode: new Queue(QUEUE_NAMES.SYNC_LEETCODE, {
      connection,
      defaultJobOptions,
    }),

    syncCodechef: new Queue(QUEUE_NAMES.SYNC_CODECHEF, {
      connection,
      defaultJobOptions,
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
 * Add a platform profile sync job to the queue.
 * @param {string} userId - MongoDB User ID
 * @param {string} platform - 'codeforces', 'leetcode', 'codechef'
 * @param {string} handle - Platform handle
 * @returns {Promise<Job>}
 */
const addPlatformSyncJob = async (userId, platform, handle) => {
  const queueMap = {
    codeforces: queues.syncCodeforces,
    leetcode: queues.syncLeetcode,
    codechef: queues.syncCodechef,
  };

  const queue = queueMap[platform];
  if (!queue) {
    initQueues(); // lazy initialization safety
    const qMap = {
      codeforces: queues.syncCodeforces,
      leetcode: queues.syncLeetcode,
      codechef: queues.syncCodechef,
    };
    if (!qMap[platform]) throw new Error(`Invalid platform for queue: ${platform}`);
  }

  // Use jobId = userId + platform to prevent duplicates
  const jobId = `${userId}-${platform}`;

  const job = await queueMap[platform].add(
    `sync-${platform}-${handle}`,
    { userId, handle, platform, triggeredAt: new Date().toISOString() },
    { jobId } // Built-in BullMQ duplicate prevention based on jobId
  );

  logger.info(`[Job] Added ${platform} sync for ${handle} (Job ID: ${job.id})`);
  return job;
};

/**
 * Check job status by platform and user ID.
 * @param {string} userId - MongoDB User ID
 * @param {string} platform - Platform name
 * @returns {Promise<object|null>} Job status
 */
const getJobStatus = async (userId, platform) => {
  const queueMap = {
    codeforces: queues.syncCodeforces,
    leetcode: queues.syncLeetcode,
    codechef: queues.syncCodechef,
  };

  const queue = queueMap[platform];
  if (!queue) return null;

  const jobId = `${userId}-${platform}`;
  const job = await queue.getJob(jobId);

  if (!job) return null;

  const state = await job.getState();
  return {
    jobId,
    platform,
    state,
    progress: job.progress,
    failedReason: job.failedReason,
  };
};

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
  addPlatformSyncJob,
  getJobStatus,
  addBatchSyncJob,
  scheduleRecurringJobs,
  closeQueues,
};
