const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * JWT utility — handles token generation and verification.
 * Centralizes all JWT logic so it can be easily swapped or extended.
 */

/**
 * Generate a signed JWT for a user.
 * @param {object} payload - Data to encode (typically { id, email })
 * @param {object} [options] - Override default options
 * @param {string} [options.expiresIn] - Token expiry (default from config)
 * @returns {string} Signed JWT
 */
const generateToken = (payload, options = {}) => {
  const { expiresIn = config.jwtExpiresIn } = options;

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn,
    issuer: 'coding-contest-analytics',
    audience: 'cca-client',
  });
};

/**
 * Verify and decode a JWT.
 * @param {string} token - JWT string
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError} If invalid or expired
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'coding-contest-analytics',
    audience: 'cca-client',
  });
};

/**
 * Decode a JWT without verifying the signature.
 * Useful for reading token contents after expiry (e.g. refresh flows).
 * @param {string} token - JWT string
 * @returns {object|null} Decoded payload or null
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate a token pair: access token + refresh token concept.
 * Access token: short-lived (from config, default 7d).
 * @param {object} user - User document
 * @returns {object} { accessToken, expiresIn }
 */
const generateAuthTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username,
  };

  const accessToken = generateToken(payload);

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: config.jwtExpiresIn,
  };
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateAuthTokens,
};
