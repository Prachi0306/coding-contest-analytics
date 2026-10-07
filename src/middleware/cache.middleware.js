const { getRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 500;

// Prune oldest entries when memory cache exceeds max size
const pruneMemoryCache = () => {
  if (memoryCache.size <= MEMORY_CACHE_MAX_SIZE) return;
  const now = Date.now();
  // First pass: remove expired
  for (const [k, v] of memoryCache) {
    if (v.expiry <= now) memoryCache.delete(k);
  }
  // Second pass: if still too large, remove oldest until at limit
  if (memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
    const excess = memoryCache.size - MEMORY_CACHE_MAX_SIZE;
    let removed = 0;
    for (const k of memoryCache.keys()) {
      if (removed >= excess) break;
      memoryCache.delete(k);
      removed++;
    }
  }
};

const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    try {
      let baseKey = req.originalUrl || req.url;
      const key = req.user ? `cache:user:${req.user.id}:${baseKey}` : `cache:public:${baseKey}`;

      // Try memory cache first (always available, fast)
      const memEntry = memoryCache.get(key);
      if (memEntry && memEntry.expiry > Date.now()) {
        logger.debug(`Memory cache hit for ${key}`);
        return res.status(200).json(memEntry.data);
      } else if (memEntry) {
        memoryCache.delete(key);
      }

      // Try Redis if available
      let redis = null;
      try {
        redis = getRedisConnection();
      } catch { /* ignore */ }

      const isRedisReady = redis && redis.status === 'ready';

      if (isRedisReady) {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis GET timeout')), 2000)
          );
          const cachedData = await Promise.race([
            redis.get(key),
            timeoutPromise
          ]);
          if (cachedData) {
            logger.debug(`Redis cache hit for ${key}`);
            const parsedData = JSON.parse(cachedData);
            // Also populate memory cache for faster subsequent access
            memoryCache.set(key, { data: parsedData, expiry: Date.now() + ttl * 1000 });
            return res.status(200).json(parsedData);
          }
        } catch (redisErr) {
          logger.debug(`Redis GET error for ${key}: ${redisErr.message}`);
        }
      }

      logger.debug(`Cache miss for ${key}`);

      // Intercept response to cache it
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Always write to memory cache
            memoryCache.set(key, { data: body, expiry: Date.now() + ttl * 1000 });
            pruneMemoryCache();

            // Also write to Redis if available (fire-and-forget)
            if (isRedisReady) {
              redis.setex(key, ttl, JSON.stringify(body)).catch((err) => {
                logger.debug(`Redis cache write error for ${key}: ${err.message}`);
              });
            }
          }
        } catch (cacheWriteErr) {
          logger.error(`Error writing to cache in middleware: ${cacheWriteErr.message}`);
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.debug(`Cache middleware error: ${error.message}`);
      next();
    }
  };
};

cacheMiddleware.clearUserCache = async (userId, pathOrPattern = null) => {
  for (const [k] of memoryCache) {
    if (k.startsWith(`cache:user:${userId}:`)) {
      if (!pathOrPattern || k.includes(pathOrPattern)) {
        memoryCache.delete(k);
      }
    }
  }

  try {
    let redis = null;
    try {
      redis = getRedisConnection();
    } catch { /* ignore */ }
    
    if (redis && redis.status === 'ready') {
      const pattern = pathOrPattern 
        ? `cache:user:${userId}:*${pathOrPattern}*`
        : `cache:user:${userId}:*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (err) {
    logger.error(`Error clearing user cache: ${err.message}`);
  }
};

module.exports = cacheMiddleware;
