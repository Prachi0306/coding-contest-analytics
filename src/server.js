const config = require('./config');
const { connectDB, disconnectDB } = require('./config/database');
const createApp = require('./app');

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
    const server = app.listen(config.port, () => {
      console.log('═══════════════════════════════════════════════');
      console.log(`  🚀 Server running in ${config.env} mode`);
      console.log(`  📡 Port: ${config.port}`);
      console.log(`  🔗 URL: http://localhost:${config.port}`);
      console.log(`  💚 Health: http://localhost:${config.port}/api/health`);
      console.log('═══════════════════════════════════════════════');
    });

    // ─── Graceful Shutdown ─────────────────────────────
    const shutdown = async (signal) => {
      console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('[Server] HTTP server closed');
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error('[Server] Unhandled Rejection:', err.message);
      shutdown('UNHANDLED_REJECTION');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('[Server] Uncaught Exception:', err.message);
      shutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    console.error(`[Server] Failed to start: ${error.message}`);
    process.exit(1);
  }
};

startServer();
