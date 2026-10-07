const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');




const register = asyncHandler(async (req, res) => {
  const { email, username, password, handles } = req.body;

  const result = await authService.register({ email, username, password, handles });

  if (result.requiresVerification) {
    return sendSuccess(res, 201, result.message, {
      requiresVerification: true,
      email: result.email,
    });
  }

  return sendSuccess(res, 201, 'Account created successfully', {
    user: result.user,
    tokens: result.tokens,
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, token } = req.body;
  const result = await authService.verifyEmail({ email, token });
  return sendSuccess(res, 200, result.message, {
    user: result.user,
    tokens: result.tokens,
  });
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.resendVerification(email);
  return sendSuccess(res, 200, result.message);
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


const updateUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const user = await authService.updateUsername(req.user.id, username);

  return sendSuccess(res, 200, 'Username updated successfully', { user });
});


const updateAvatar = asyncHandler(async (req, res) => {
  const { avatar } = req.body;
  const user = await authService.updateAvatar(req.user.id, avatar);

  return sendSuccess(res, 200, 'Profile picture updated successfully', { user });
});

module.exports = {
  register,
  login,
  changePassword,
  getProfile,
  updateUsername,
  updateAvatar,
  verifyEmail,
  resendVerification,
};

