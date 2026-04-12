const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/responseHandler');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint — returns server + DB status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      state: dbStates[mongoose.connection.readyState] || 'unknown',
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
    },
  };

  return sendSuccess(res, 200, 'Server is healthy', healthData);
});

module.exports = router;
