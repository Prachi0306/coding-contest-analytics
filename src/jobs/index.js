const { initQueues, scheduleRecurringJobs, closeQueues } = require('./queues');
const { startWorkers, stopWorkers } = require('./workers');
const { isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');



let initialized = false;


const initJobSystem = async () => {
  if (initialized) {
    logger.warn('Job system already initialized, skipping');
    return;
  }

  try {
    const redisUp = await isRedisAvailable();
    if (!redisUp) {
      logger.warn('Redis is not available — background jobs disabled. Server will continue without them.');
      return;
    }

    initQueues();

    startWorkers();

    await scheduleRecurringJobs();

    initialized = true;
    logger.info('Background job system fully initialized');
  } catch (error) {
    logger.error('Failed to initialize job system', {
      error: error.message,
      stack: error.stack,
    });
    logger.warn('Server will continue without background jobs');
  }
};


const shutdownJobSystem = async () => {
  if (!initialized) return;

  try {
    await stopWorkers();
    await closeQueues();
    initialized = false;
    logger.info('Background job system shut down');
  } catch (error) {
    logger.error('Error shutting down job system', { error: error.message });
  }
};

module.exports = {
  initJobSystem,
  shutdownJobSystem,
};
