const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * JWT Authentication Middleware.
 *
 * Extracts the Bearer token from the Authorization header,
 * verifies it, loads the user from the database, and attaches
 * the user to `req.user` for downstream handlers.
 *
 * Usage:
 *   router.get('/protected', authenticate, controller.handler);
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // ─── 1. Extract token from header ───────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    throw AppError.unauthorized('Access denied. Invalid token format.');
  }

  // ─── 2. Verify token ───────────────────────────────
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    // Let the global error handler transform JWT-specific errors
    // (JsonWebTokenError → 401, TokenExpiredError → 401)
    throw error;
  }

  // ─── 3. Check if user still exists ──────────────────
  const user = await userRepository.findById(decoded.id);

  if (!user) {
    logger.warn('Token valid but user no longer exists', { userId: decoded.id });
    throw AppError.unauthorized('The user belonging to this token no longer exists.');
  }

  // ─── 4. Check if user is active ────────────────────
  if (!user.isActive) {
    logger.warn('Token valid but user account is deactivated', { userId: decoded.id });
    throw AppError.forbidden('This account has been deactivated. Please contact support.');
  }

  // ─── 5. Attach user to request ─────────────────────
  req.user = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
  };

  next();
});

/**
 * Optional authentication middleware.
 *
 * Same as `authenticate`, but does NOT throw if no token is present.
 * If a valid token is provided, `req.user` is populated.
 * If no token or invalid token, `req.user` remains undefined and the request proceeds.
 *
 * Useful for endpoints that behave differently for authenticated vs anonymous users.
 *
 * Usage:
 *   router.get('/public-or-private', optionalAuth, controller.handler);
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token — proceed without user
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return next(); // Bad format — proceed without user
  }

  try {
    const decoded = verifyToken(token);
    const user = await userRepository.findById(decoded.id);

    if (user && user.isActive) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      };
    }
  } catch (error) {
    // Token invalid or expired — silently proceed without user
    logger.debug('Optional auth: token invalid, proceeding as anonymous', {
      error: error.message,
    });
  }

  next();
});

module.exports = { authenticate, optionalAuth };
