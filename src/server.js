const config = require('./config');
const { connectDB, disconnectDB } = require('./config/database');
const createApp = require('./app');
const logger = require('./utils/logger');
const { initJobSystem, shutdownJobSystem } = require('./jobs');
const { closeRedisConnections } = require('./config/redis');
const { initCronJobs, stopCronJobs } = require('./cron/sync.cron');

/**
 * Server entry point.
 * Connects to MongoDB, then starts the Express server.
 */
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Create Express app
    const app = createApp();

    // 3. Start listening
    const server = app.listen(config.port, async () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info(`  🚀 Server running in ${config.env} mode`);
      logger.info(`  📡 Port: ${config.port}`);
      logger.info(`  🔗 URL: http://localhost:${config.port}`);
      logger.info(`  💚 Health: http://localhost:${config.port}/api/health`);
      logger.info('═══════════════════════════════════════════════');

      // 4. Initialize background job system (non-blocking)
      await initJobSystem();

      // 5. Initialize cron jobs (node-cron, no Redis required)
      initCronJobs();
    });

    // ─── Graceful Shutdown ─────────────────────────────
    const shutdown = async (signal) => {
      logger.warn(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');
        stopCronJobs();
        await shutdownJobSystem();
        await closeRedisConnections();
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
      shutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
      shutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

startServer();
