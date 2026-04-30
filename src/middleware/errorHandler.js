const { sendError } = require('../utils/responseHandler');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');



const handleCastError = (err) => {
  return AppError.badRequest(`Invalid value "${err.value}" for field "${err.path}"`);
};


const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message);
  return AppError.validation(`Validation failed: ${messages.join('. ')}`);
};


const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'unknown';
  const value = err.keyValue ? err.keyValue[field] : 'unknown';
  return AppError.conflict(`Duplicate value "${value}" for field "${field}"`);
};


const handleJoiValidationError = (err) => {
  const details = err.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message.replace(/"/g, ''),
    type: detail.type,
  }));
  const message = details.map((d) => d.message).join('; ');
  const appError = AppError.validation(`Validation failed: ${message}`);
  appError.details = details;
  return appError;
};


const handleJWTError = () => {
  return AppError.unauthorized('Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
  return AppError.unauthorized('Token expired. Please log in again.');
};



const notFoundHandler = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};



const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  if (err.isJoi) error = handleJoiValidationError(err);
  else if (err.name === 'CastError') error = handleCastError(err);
  else if (err.name === 'ValidationError') error = handleValidationError(err);
  else if (err.code === 11000) error = handleDuplicateKeyError(err);
  else if (err.name === 'JsonWebTokenError') error = handleJWTError();
  else if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  const isOperational = error.isOperational !== undefined ? error.isOperational : false;

  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      stack: err.stack,
      isOperational,
    });
  } else {
    logger.warn(`${statusCode} - ${message}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });
  }

  const response = {
    statusCode,
    message,
  };

  if (error.details) {
    response.details = error.details;
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.isOperational = isOperational;
  }

  return sendError(res, statusCode, message, response);
};

module.exports = { notFoundHandler, globalErrorHandler };
