const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authSchemas } = require('../validations');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post(
  '/register',
  validate(authSchemas.register),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
router.post(
  '/login',
  validate(authSchemas.login),
  authController.login
);

// ─── Protected Routes ───────────────────────────────

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change authenticated user's password
 * @access  Private
 */
router.put(
  '/change-password',
  authenticate,
  validate(authSchemas.changePassword),
  authController.changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user's profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  authController.getProfile
);

module.exports = router;
