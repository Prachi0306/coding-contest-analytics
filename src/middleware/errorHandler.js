const { sendError } = require('../utils/responseHandler');

/**
 * 404 handler — catches requests that don't match any route.
 */
const notFoundHandler = (req, res) => {
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

/**
 * Global error handler — catches all errors bubbled up from controllers/middleware.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  // Default to 500 if no status code is set
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log errors in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  return sendError(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};

module.exports = { notFoundHandler, globalErrorHandler };
