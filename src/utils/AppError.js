/**
 * Custom application error class.
 * Extends native Error to carry HTTP status codes and operational flags.
 *
 * Usage:
 *   throw new AppError('User not found', 404);
 *   throw AppError.badRequest('Invalid email format');
 *   throw AppError.unauthorized('Token expired');
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {boolean} isOperational - Whether this is an expected/operational error (default true)
   */
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  // ─── Factory Methods ───────────────────────────────

  /**
   * 400 Bad Request
   * @param {string} message
   * @returns {AppError}
   */
  static badRequest(message = 'Bad Request') {
    return new AppError(message, 400);
  }

  /**
   * 401 Unauthorized
   * @param {string} message
   * @returns {AppError}
   */
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  /**
   * 403 Forbidden
   * @param {string} message
   * @returns {AppError}
   */
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }

  /**
   * 404 Not Found
   * @param {string} message
   * @returns {AppError}
   */
  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  /**
   * 409 Conflict (e.g. duplicate resource)
   * @param {string} message
   * @returns {AppError}
   */
  static conflict(message = 'Resource already exists') {
    return new AppError(message, 409);
  }

  /**
   * 422 Unprocessable Entity (validation failure)
   * @param {string} message
   * @returns {AppError}
   */
  static validation(message = 'Validation failed') {
    return new AppError(message, 422);
  }

  /**
   * 429 Too Many Requests
   * @param {string} message
   * @returns {AppError}
   */
  static tooManyRequests(message = 'Too many requests, please try again later') {
    return new AppError(message, 429);
  }

  /**
   * 500 Internal Server Error (non-operational)
   * @param {string} message
   * @returns {AppError}
   */
  static internal(message = 'Internal Server Error') {
    return new AppError(message, 500, false);
  }

  /**
   * 503 Service Unavailable
   * @param {string} message
   * @returns {AppError}
   */
  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new AppError(message, 503);
  }

  /**
   * Serialize error for JSON response.
   * @returns {object}
   */
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
