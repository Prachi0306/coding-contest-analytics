const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');
const { sendSuccess } = require('../utils/responseHandler');


const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      const redis = getRedisConnection();
      
      let baseKey = req.originalUrl || req.url;
      
      const key = req.user ? `cache:user:${req.user.id}:${baseKey}` : `cache:public:${baseKey}`;
      
      const cachedData = await redis.get(key);
      
      if (cachedData) {
        logger.debug(`Cache hit for ${key}`);
        const parsedData = JSON.parse(cachedData);
        return res.status(200).json(parsedData);
      }
      
      logger.debug(`Cache miss for ${key}`);
      
      const originalJson = res.json.bind(res);
      res.json = (body) => {
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
      next();
    }
  };
};

module.exports = cacheMiddleware;
