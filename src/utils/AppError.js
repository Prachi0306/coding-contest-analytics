class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }


  static badRequest(message = 'Bad Request') {
    return new AppError(message, 400);
  }


  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }


  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }


  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }


  static conflict(message = 'Resource already exists') {
    return new AppError(message, 409);
  }


  static validation(message = 'Validation failed') {
    return new AppError(message, 422);
  }


  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(message, 429);
  }


  static internal(message = 'Internal Server Error') {
    return new AppError(message, 500, false);
  }


  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new AppError(message, 503);
  }


  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
    };
  }
}

module.exports = AppError;
