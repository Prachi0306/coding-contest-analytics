const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const config = require('./config');
const routes = require('./routes');
const logger = require('./utils/logger');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');


const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(compression());

  if (config.env !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
  }

  app.use('/api', routes);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Coding Contest Analytics Platform API',
      version: '1.0.0',
      docs: '/api/health',
    });
  });

  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
};

module.exports = createApp;
