const cron = require('node-cron');
const cronService = require('../services/cron.service');
const logger = require('../utils/logger');



let contestSyncTask = null;


const initCronJobs = () => {
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
