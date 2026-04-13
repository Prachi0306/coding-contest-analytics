const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Auth Controller — thin layer that delegates to AuthService.
 * Handles HTTP concerns (req/res) only; no business logic here.
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { email, username, password, handles } = req.body;

  const result = await authService.register({ email, username, password, handles });

  return sendSuccess(res, 201, 'Account created successfully', {
    user: result.user,
    tokens: result.tokens,
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  const result = await authService.login({ email, username, password });

  return sendSuccess(res, 200, 'Login successful', {
    user: result.user,
    tokens: result.tokens,
  });
});

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change authenticated user's password
 * @access  Private (requires auth middleware — wired in Step 7)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.id, currentPassword, newPassword);

  return sendSuccess(res, 200, 'Password changed successfully');
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user's profile
 * @access  Private (requires auth middleware — wired in Step 7)
 */
const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);

  return sendSuccess(res, 200, 'Profile retrieved', { user });
});

module.exports = {
  register,
  login,
  changePassword,
  getProfile,
};
