const Joi = require('joi');
const { email, username, password, handles } = require('./common.validation');

// ─── Auth Validation Schemas ────────────────────────────

/**
 * POST /api/auth/register
 * Validates new user registration payload.
 */
const register = Joi.object({
  email: email.required().label('email'),
  username: username.required().label('username'),
  password: password.required().label('password'),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({ 'any.only': 'Passwords do not match' })
    .label('confirmPassword'),
  handles: handles.optional().default({}),
});

/**
 * POST /api/auth/login
 * Validates login payload — supports email or username.
 */
const login = Joi.object({
  // Allow either email or username for flexible login
  email: email.label('email'),
  username: username.label('username'),
  password: Joi.string().required().label('password'),
})
  .or('email', 'username')
  .messages({
    'object.missing': 'Either email or username is required',
  });

/**
 * PUT /api/auth/change-password
 * Validates password change request.
 */
const changePassword = Joi.object({
  currentPassword: Joi.string().required().label('currentPassword'),
  newPassword: password.required().label('newPassword'),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({ 'any.only': 'Passwords do not match' })
    .label('confirmNewPassword'),
})
  .custom((value, helpers) => {
    if (value.currentPassword === value.newPassword) {
      return helpers.error('any.invalid', {
        message: 'New password must be different from current password',
      });
    }
    return value;
  });

module.exports = {
  register,
  login,
  changePassword,
};
