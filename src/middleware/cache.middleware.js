const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Cache middleware using Redis.
 * @param {number} ttl - Time to live in seconds default is 300 (5 minutes)
 * @returns {function} Express middleware function
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const redis = getRedisConnection();
      
      // Use the full URL as the base key
      let baseKey = req.originalUrl || req.url;
      
      // If the route is private and req.user exists, append user ID to ensure cache isolation
      const key = req.user ? `cache:user:${req.user.id}:${baseKey}` : `cache:public:${baseKey}`;
      
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        logger.debug(`Cache hit for ${key}`);
        const parsedData = JSON.parse(cachedData);
        // We assume the data was formatted via sendSuccess
        return res.status(200).json(parsedData);
      }
      
      logger.debug(`Cache miss for ${key}`);
      
      // Override res.json to intercept and cache the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache only successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(key, ttl, JSON.stringify(body)).catch((err) => {
            logger.error(`Redis cache write error for ${key}: ${err.message}`);
          });
        }
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      logger.error(`Redis cache error: ${error.message}`);
      // Fallback to non-cached response on Redis error
      next();
    }
  };
};

module.exports = cacheMiddleware;
