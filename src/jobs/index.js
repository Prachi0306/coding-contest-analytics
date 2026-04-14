const { initQueues, scheduleRecurringJobs, closeQueues } = require('./queues');
const { startWorkers, stopWorkers } = require('./workers');
const { isRedisAvailable } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Central job system initializer.
 *
 * Call `initJobSystem()` during server startup to:
 * 1. Check Redis availability
 * 2. Initialize queues
 * 3. Start workers
 * 4. Schedule recurring jobs
 *
 * Call `shutdownJobSystem()` during graceful shutdown.
 */

let initialized = false;

/**
 * Initialize the full background job system.
 * Skips gracefully if Redis is not available.
 */
const initJobSystem = async () => {
  if (initialized) {
    logger.warn('Job system already initialized, skipping');
    return;
  }

  try {
    // 0. Check if Redis is reachable
    const redisUp = await isRedisAvailable();
    if (!redisUp) {
      logger.warn('Redis is not available — background jobs disabled. Server will continue without them.');
      return;
    }

    // 1. Initialize queues
    initQueues();

    // 2. Start workers
    startWorkers();

    // 3. Schedule recurring jobs
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

/**
 * Gracefully shut down the job system.
 */
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
