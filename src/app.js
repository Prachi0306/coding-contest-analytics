const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const config = require('./config');
const routes = require('./routes');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

/**
 * Create and configure the Express application.
 * Separated from server.js for testability.
 */
const createApp = () => {
  const app = express();

  // ─── Security ──────────────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // ─── Body Parsing ──────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ─── Compression ───────────────────────────────────
  app.use(compression());

  // ─── HTTP Logging ──────────────────────────────────
  if (config.env !== 'test') {
    app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));
  }

  // ─── API Routes ────────────────────────────────────
  app.use('/api', routes);

  // ─── Root Endpoint ─────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Coding Contest Analytics Platform API',
      version: '1.0.0',
      docs: '/api/health',
    });
  });

  // ─── Error Handling ────────────────────────────────
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;
