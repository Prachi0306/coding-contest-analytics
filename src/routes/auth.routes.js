const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
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

// ─── Protected routes (auth middleware added in Step 7) ──

// router.put('/change-password', authMiddleware, validate(authSchemas.changePassword), authController.changePassword);
// router.get('/me', authMiddleware, authController.getProfile);

module.exports = router;
