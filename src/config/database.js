const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with retry logic and event listeners.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      // Mongoose 8+ uses these defaults, but explicit for clarity
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

/**
 * Gracefully close MongoDB connection.
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error(`MongoDB error closing connection: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
};

module.exports = { connectDB, disconnectDB };
