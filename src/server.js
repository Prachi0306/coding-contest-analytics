const config = require('./config');
const { connectDB, disconnectDB } = require('./config/database');
const createApp = require('./app');
const logger = require('./utils/logger');
const { initJobSystem, shutdownJobSystem } = require('./jobs');
const { closeRedisConnections } = require('./config/redis');
const { initCronJobs, stopCronJobs } = require('./cron/sync.cron');


const startServer = async () => {
  try {
    await connectDB();

    const app = createApp();

    const server = app.listen(config.port, async () => {
      logger.info('═══════════════════════════════════════════════');
      logger.info(`  🚀 Server running in ${config.env} mode`);
      logger.info(`  📡 Port: ${config.port}`);
      logger.info(`  🔗 URL: http://localhost:${config.port}`);
      logger.info(`  💚 Health: http://localhost:${config.port}/api/health`);
      logger.info('═══════════════════════════════════════════════');

      await initJobSystem();

      initCronJobs();
    });

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

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
      shutdown('UNHANDLED_REJECTION');
    });

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
