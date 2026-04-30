const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');




const register = asyncHandler(async (req, res) => {
  const { email, username, password, handles } = req.body;

  const result = await authService.register({ email, username, password, handles });

  return sendSuccess(res, 201, 'Account created successfully', {
    user: result.user,
    tokens: result.tokens,
  });
});


const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  const result = await authService.login({ email, username, password });

  return sendSuccess(res, 200, 'Login successful', {
    user: result.user,
    tokens: result.tokens,
  });
});


const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.id, currentPassword, newPassword);

  return sendSuccess(res, 200, 'Password changed successfully');
});


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
