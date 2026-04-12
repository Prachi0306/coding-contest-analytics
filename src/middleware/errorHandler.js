const { sendError } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ─── Mongoose Error Handlers ────────────────────────

/**
 * Handle Mongoose CastError (e.g. invalid ObjectId).
 */
const handleCastError = (err) => {
  return AppError.badRequest(`Invalid value "${err.value}" for field "${err.path}"`);
};

/**
 * Handle Mongoose ValidationError (schema validation failure).
 */
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return AppError.validation(`Validation failed: ${messages.join('. ')}`);
};

/**
 * Handle MongoDB duplicate key error (code 11000).
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'unknown';
  const value = err.keyValue ? err.keyValue[field] : 'unknown';
  return AppError.conflict(`Duplicate value "${value}" for field "${field}"`);
};

/**
 * Handle JWT errors.
 */
const handleJWTError = () => {
  return AppError.unauthorized('Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
  return AppError.unauthorized('Token expired. Please log in again.');
};

// ─── 404 Handler ────────────────────────────────────

/**
 * 404 handler — catches requests that don't match any route.
 */
const notFoundHandler = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

// ─── Global Error Handler ───────────────────────────

/**
 * Global error handler — catches all errors bubbled up from controllers/middleware.
 * Must have 4 parameters for Express to recognize it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  // Clone the error so we can transform it without mutating the original
  let error = { ...err, message: err.message, stack: err.stack };

  // ─── Transform known error types into AppError ────
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // ─── Determine final status + message ─────────────
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const isOperational = error.isOperational !== undefined ? error.isOperational : false;

  // ─── Logging ──────────────────────────────────────
  if (statusCode >= 500) {
    // Unexpected errors get full stack traces
    logger.error(`${statusCode} - ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      stack: err.stack,
      isOperational,
    });
  } else {
    // Operational errors get a warning-level log
    logger.warn(`${statusCode} - ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  }

  // ─── Response ─────────────────────────────────────
  const response = {
    statusCode,
    message,
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.isOperational = isOperational;
  }

  return sendError(res, statusCode, message, process.env.NODE_ENV === 'development' ? response : undefined);
};

module.exports = { notFoundHandler, globalErrorHandler };
