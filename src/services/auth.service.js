const userRepository = require('../repositories/user.repository');
const { generateAuthTokens } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');


class AuthService {

  async register({ email, username, password, handles }) {
    const emailTaken = await userRepository.emailExists(email);
    if (emailTaken) {
      throw AppError.conflict('An account with this email already exists');
    }

    const usernameTaken = await userRepository.usernameExists(username);
    if (usernameTaken) {
      throw AppError.conflict('This username is already taken');
    }

    const user = await userRepository.create({
      email,
      username,
      password,
      handles: handles || {},
    });

    const tokens = generateAuthTokens(user);

    logger.info(`New user registered: ${username} (${email})`);

    return {
      user: user.toJSON(),
      tokens,
    };
  }


  async login({ email, username, password }) {
    const identifier = email || username;

    const user = await userRepository.findByCredentials(identifier);
    if (!user) {
      throw AppError.unauthorized('Invalid email/username or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('This account has been deactivated. Please contact support.');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email/username or password');
    }

    await userRepository.updateLastLogin(user._id);

    const tokens = generateAuthTokens(user);

    logger.info(`User logged in: ${user.username} (${user.email})`);

    return {
      user: user.toJSON(),
      tokens,
    };
  }


  async changePassword(userId, currentPassword, newPassword) {
    const user = await userRepository.findById(userId, '+password');
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Current password is incorrect');
    }

    await userRepository.updatePassword(userId, newPassword);

    logger.info(`Password changed for user: ${user.username}`);
  }


  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user.toJSON();
  }
}

module.exports = new AuthService();
