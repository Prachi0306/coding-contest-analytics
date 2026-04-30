const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');


const QUEUE_NAMES = {
  SYNC_CONTESTS: 'sync-contests',
  SYNC_CODEFORCES: 'sync-codeforces',
  SYNC_LEETCODE: 'sync-leetcode',
  SYNC_CODECHEF: 'sync-codechef',
  SYNC_ALL_USERS: 'sync-all-users',
};


let queues = {};


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



const addPlatformSyncJob = async (userId, platform, handle) => {
  let queue = null;

  const getQueue = (p) => {
    switch (p) {
      case 'codeforces': return queues.syncCodeforces;
      case 'leetcode': return queues.syncLeetcode;
      case 'codechef': return queues.syncCodechef;
      default: return null;
    }
  };

  queue = getQueue(platform);

  if (!queue) {
    initQueues();
    queue = getQueue(platform);
    if (!queue) throw new Error(`Invalid platform for queue: ${platform}`);
  }

  const jobId = `${userId}-${platform}`;

  const job = await queue.add(
    `sync-${platform}-${handle}`,
    { userId, handle, platform, triggeredAt: new Date().toISOString() },
    { jobId }
  );

  logger.info(`[Job] Added ${platform} sync for ${handle} (Job ID: ${job.id})`);
  return job;
};


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


const addContestSyncJob = async () => {
  if (!queues.syncContests) initQueues();
  const job = await queues.syncContests.add('sync-codeforces-contests', {
    platform: 'codeforces',
    triggeredAt: new Date().toISOString(),
  });
  logger.info(`Contest sync job added: ${job.id}`);
  return job;
};


const addBatchSyncJob = async () => {
  if (!queues.syncAllUsers) initQueues();
  const job = await queues.syncAllUsers.add('sync-all-users', {
    triggeredAt: new Date().toISOString(),
  });
  logger.info(`Batch sync job added: ${job.id}`);
  return job;
};


const scheduleRecurringJobs = async () => {
  if (!queues.syncContests) initQueues();

  await queues.syncContests.add(
    'scheduled-contest-sync',
    { platform: 'codeforces', scheduled: true },
    {
      repeat: { pattern: '0 */6 * * *' },
      jobId: 'recurring-contest-sync',
    }
  );

  await queues.syncAllUsers.add(
    'scheduled-all-users-sync',
    { scheduled: true },
    {
      repeat: { pattern: '0 */12 * * *' },
      jobId: 'recurring-all-users-sync',
    }
  );

  logger.info('Recurring jobs scheduled', {
    contestSync: 'Every 6 hours',
    allUsersSync: 'Every 12 hours',
  });
};


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
