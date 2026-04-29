const cron = require('node-cron');
const cronService = require('../services/cron.service');
const logger = require('../utils/logger');

/**
 * Cron Job Scheduler — initializes all background cron jobs.
 *
 * Schedule reference:
 *   '0 *​/6 * * *'  →  Every 6 hours (00:00, 06:00, 12:00, 18:00)
 *
 * Call `initCronJobs()` after MongoDB connection is established.
 * Call `stopCronJobs()` during graceful shutdown.
 */

let contestSyncTask = null;

/**
 * Initialize and start all cron jobs.
 */
const initCronJobs = () => {
  // ─── Contest Sync: Every 6 hours ────────────────────
  contestSyncTask = cron.schedule('0 */6 * * *', async () => {
    logger.info('[CRON] Triggering scheduled contest sync...');
    try {
      await cronService.syncContests();
    } catch (err) {
      logger.error('[CRON] Scheduled contest sync threw an unhandled error', {
        error: err.message,
      });
    }
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  logger.info('═══════════════════════════════════════════════');
  logger.info('  ⏰ Cron jobs initialized');
  logger.info('  📋 Contest Sync: Every 6 hours (UTC)');
  logger.info('═══════════════════════════════════════════════');
};

/**
 * Gracefully stop all cron jobs.
 */
const stopCronJobs = () => {
  if (contestSyncTask) {
    contestSyncTask.stop();
    contestSyncTask = null;
    logger.info('[CRON] All cron jobs stopped');
  }
};

module.exports = {
  initCronJobs,
  stopCronJobs,
};
