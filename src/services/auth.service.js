const userRepository = require('../repositories/user.repository');
const { generateAuthTokens } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Auth Service — business logic for authentication flows.
 * Orchestrates repository calls and JWT generation.
 */
class AuthService {
  /**
   * Register a new user.
   *
   * @param {object} data - { email, username, password, handles }
   * @returns {Promise<{ user: object, tokens: object }>}
   * @throws {AppError} 409 if email or username already taken
   */
  async register({ email, username, password, handles }) {
    // ─── Check for existing email ────────────────────
    const emailTaken = await userRepository.emailExists(email);
    if (emailTaken) {
      throw AppError.conflict('An account with this email already exists');
    }

    // ─── Check for existing username ─────────────────
    const usernameTaken = await userRepository.usernameExists(username);
    if (usernameTaken) {
      throw AppError.conflict('This username is already taken');
    }

    // ─── Create user ─────────────────────────────────
    const user = await userRepository.create({
      email,
      username,
      password, // Hashed by the User model pre-save hook
      handles: handles || {},
    });

    // ─── Generate JWT ────────────────────────────────
    const tokens = generateAuthTokens(user);

    logger.info(`New user registered: ${username} (${email})`);

    return {
      user: user.toJSON(), // Password excluded via toJSON transform
      tokens,
    };
  }

  /**
   * Authenticate a user with email/username and password.
   *
   * @param {object} credentials - { email?, username?, password }
   * @returns {Promise<{ user: object, tokens: object }>}
   * @throws {AppError} 401 if credentials are invalid
   */
  async login({ email, username, password }) {
    // ─── Determine login identifier ──────────────────
    const identifier = email || username;

    // ─── Find user (with password field) ─────────────
    const user = await userRepository.findByCredentials(identifier);
    if (!user) {
      // Use a generic message to prevent user enumeration attacks
      throw AppError.unauthorized('Invalid email/username or password');
    }

    // ─── Check if account is active ──────────────────
    if (!user.isActive) {
      throw AppError.forbidden('This account has been deactivated. Please contact support.');
    }

    // ─── Verify password ─────────────────────────────
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email/username or password');
    }

    // ─── Update last login ───────────────────────────
    await userRepository.updateLastLogin(user._id);

    // ─── Generate JWT ────────────────────────────────
    const tokens = generateAuthTokens(user);

    logger.info(`User logged in: ${user.username} (${user.email})`);

    return {
      user: user.toJSON(),
      tokens,
    };
  }

  /**
   * Change a user's password.
   *
   * @param {string} userId - Authenticated user's ID
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @returns {Promise<void>}
   * @throws {AppError} 401 if current password is wrong
   * @throws {AppError} 404 if user not found
   */
  async changePassword(userId, currentPassword, newPassword) {
    // ─── Fetch user with password ────────────────────
    const user = await userRepository.findById(userId, '+password');
    if (!user) {
      throw AppError.notFound('User not found');
    }

    // ─── Verify current password ─────────────────────
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Current password is incorrect');
    }

    // ─── Update password ─────────────────────────────
    await userRepository.updatePassword(userId, newPassword);

    logger.info(`Password changed for user: ${user.username}`);
  }

  /**
   * Get the currently authenticated user's profile.
   *
   * @param {string} userId - Authenticated user's ID
   * @returns {Promise<object>} User profile
   * @throws {AppError} 404 if user not found
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user.toJSON();
  }
}

module.exports = new AuthService();
