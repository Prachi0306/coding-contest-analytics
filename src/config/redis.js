const IORedis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Shared Redis connection for BullMQ.
 * BullMQ requires ioredis, not the generic redis client.
 *
 * Returns a factory function so each queue/worker gets its own connection
 * (BullMQ best practice — avoids blocking issues).
 */

let connectionInstance = null;

/**
 * Check if Redis is available by attempting a quick PING.
 * @returns {Promise<boolean>} True if Redis responds to PING
 */
const isRedisAvailable = async () => {
  const testConn = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 3000,
    retryStrategy: () => null, // Don't retry
  });

  // Suppress error events during probe
  testConn.on('error', () => {});

  try {
    const result = await testConn.ping();
    await testConn.quit();
    return result === 'PONG';
  } catch {
    try { testConn.disconnect(); } catch {}
    return false;
  }
};

/**
 * Create a new ioredis connection for BullMQ.
 * @param {string} [role='default'] - Connection role for logging
 * @returns {IORedis} Redis connection instance
 */
const createRedisConnection = (role = 'default') => {
  const connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,    // Required by BullMQ
    retryStrategy: (times) => {
      if (times > 5) {
        logger.error(`Redis ${role}: max retries reached, giving up`);
        return null; // Stop retrying
      }
      const delay = Math.min(times * 1000, 5000);
      return delay;
    },
  });

  connection.on('connect', () => {
    logger.info(`Redis ${role}: connected`);
  });

  connection.on('error', (err) => {
    logger.debug(`Redis ${role}: ${err.message}`);
  });

  return connection;
};

/**
 * Get or create a shared Redis connection (for queue producers).
 * @returns {IORedis}
 */
const getRedisConnection = () => {
  if (!connectionInstance) {
    connectionInstance = createRedisConnection('shared');
  }
  return connectionInstance;
};

/**
 * Close all Redis connections gracefully.
 */
const closeRedisConnections = async () => {
  if (connectionInstance) {
    try {
      if (connectionInstance.status === 'ready' || connectionInstance.status === 'connect') {
        await connectionInstance.quit();
      } else {
        connectionInstance.disconnect();
      }
      logger.info('Redis shared connection closed');
    } catch (error) {
      logger.warn(`Redis close error (safe to ignore): ${error.message}`);
    } finally {
      connectionInstance = null;
    }
  }
};

module.exports = {
  isRedisAvailable,
  createRedisConnection,
  getRedisConnection,
  closeRedisConnections,
};

