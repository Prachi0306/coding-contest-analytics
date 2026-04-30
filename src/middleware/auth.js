const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');


const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Access denied. No token provided.');
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    throw AppError.unauthorized('Access denied. Invalid token format.');
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {

    throw error;
  }

  const user = await userRepository.findById(decoded.id);

  if (!user) {
    logger.warn('Token valid but user no longer exists', { userId: decoded.id });
    throw AppError.unauthorized('The user belonging to this token no longer exists.');
  }

  if (!user.isActive) {
    logger.warn('Token valid but user account is deactivated', { userId: decoded.id });
    throw AppError.forbidden('This account has been deactivated. Please contact support.');
  }

  req.user = {
    id: user._id.toString(),
    email: user.email,
    username: user.username,
  };

  next();
});


const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (!token || token === 'null' || token === 'undefined') {
    return next();
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
    logger.debug('Optional auth: token invalid, proceeding as anonymous', {
      error: error.message,
    });
  }

  next();
});

module.exports = { authenticate, optionalAuth };
