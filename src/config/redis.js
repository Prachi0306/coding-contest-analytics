const IORedis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');



let connectionInstance = null;


const isRedisAvailable = async () => {
  const testConn = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 3000,
    retryStrategy: () => null,
  });

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


const createRedisConnection = (role = 'default') => {
  const connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 5) {
        logger.error(`Redis ${role}: max retries reached, giving up`);
        return null;
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


const getRedisConnection = () => {
  if (!connectionInstance) {
    connectionInstance = createRedisConnection('shared');
  }
  return connectionInstance;
};


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

