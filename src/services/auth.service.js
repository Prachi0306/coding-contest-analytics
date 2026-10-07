const userRepository = require('../repositories/user.repository');
const { generateAuthTokens } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');


class AuthService {

  async register({ email, username, password, handles }) {
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    const emailService = require('./email.service');
    const User = require('../models/User');

    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user && user.isVerified) {
      throw AppError.conflict('An account with this email already exists');
    }

    const usernameTaken = await User.findOne({ username, _id: { $ne: user?._id } });
    if (usernameTaken) {
      throw AppError.conflict('This username is already taken');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (user) {
      user.verificationToken = hashedToken;
      user.verificationTokenExpiresAt = tokenExpiry;
      user.password = password; // update password to new one if unverified
      user.username = username;
      user.verificationAttempts = 0;
      user.lastVerificationResend = new Date();
      await user.save();
    } else {
      user = await userRepository.create({
        email,
        username,
        password,
        handles: handles || {},
      });
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            verificationToken: hashedToken,
            verificationTokenExpiresAt: tokenExpiry,
            isVerified: false,
            verificationAttempts: 0,
            lastVerificationResend: new Date()
          }
        }
      );
    }

    await emailService.sendVerificationEmail(email, token);

    logger.info(`New user registered, verification required: ${username} (${email})`);

    return {
      message: 'Verification email sent. Please verify your account.',
      requiresVerification: true,
      email: user.email,
    };
  }

  async verifyEmail({ email, token }) {
    const bcrypt = require('bcryptjs');
    const User = require('../models/User');
    const user = await User.findOne({ email: email.toLowerCase() }).select('+verificationToken +verificationTokenExpiresAt +verificationAttempts');
    
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (user.isVerified) {
      throw AppError.badRequest('Email is already verified');
    }

    if (user.verificationAttempts >= 5) {
      throw AppError.tooManyRequests('Too many failed attempts. Please request a new verification code.');
    }

    if (!user.verificationToken) {
      throw AppError.badRequest('No active verification token found');
    }

    const isValid = await bcrypt.compare(token, user.verificationToken);
    if (!isValid) {
      user.verificationAttempts = (user.verificationAttempts || 0) + 1;
      await user.save();
      throw AppError.badRequest('Invalid verification token');
    }

    if (new Date() > user.verificationTokenExpiresAt) {
      throw AppError.badRequest('Verification token has expired');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    user.verificationAttempts = 0;
    await user.save();

    await userRepository.updateLastLogin(user._id);
    const tokens = generateAuthTokens(user);

    logger.info(`User email verified: ${user.email}`);

    return {
      message: 'Email verified successfully',
      user: user.toJSON(),
      tokens,
    };
  }

  async resendVerification(email) {
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    const emailService = require('./email.service');
    const User = require('../models/User');

    const user = await User.findOne({ email: email.toLowerCase() }).select('+lastVerificationResend');
    
    if (!user || user.isVerified) {
      return { message: 'If your email is registered and unverified, a verification link has been sent.' };
    }

    if (user.lastVerificationResend && (Date.now() - user.lastVerificationResend.getTime() < 60000)) {
      throw AppError.tooManyRequests('Please wait a minute before requesting another verification email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationToken: hashedToken,
          verificationTokenExpiresAt: tokenExpiry,
          verificationAttempts: 0,
          lastVerificationResend: new Date()
        }
      }
    );

    await emailService.sendVerificationEmail(email, token);
    
    return {
      message: 'If your email is registered and unverified, a verification link has been sent.',
    };
  }


  async login({ email, username, password }) {
    const identifier = email || username;

    const user = await userRepository.findByCredentials(identifier);
    if (!user) {
      throw AppError.unauthorized('Invalid email/username or password');
    }

    if (!user.isVerified) {
      throw AppError.forbidden('Email not verified. Please verify your email before logging in.');
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


  async updateUsername(userId, newUsername) {
    if (!newUsername || typeof newUsername !== 'string') {
      throw AppError.badRequest('Username is required');
    }

    const trimmed = newUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      throw AppError.badRequest('Username must be between 3 and 30 characters');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw AppError.badRequest('Username may only contain letters, numbers, underscores, and hyphens');
    }

    const User = require('../models/User');
    const existing = await User.findOne({
      username: new RegExp(`^${trimmed}$`, 'i'),
      _id: { $ne: userId },
    });

    if (existing) {
      throw AppError.conflict('This username is already taken');
    }

    const updatedUser = await userRepository.updateUsername(userId, trimmed);
    if (!updatedUser) {
      throw AppError.notFound('User not found');
    }

    logger.info(`Username updated for user ${userId}: ${trimmed}`);
    return updatedUser.toJSON();
  }


  async updateAvatar(userId, avatarData) {
    if (!avatarData || typeof avatarData !== 'string') {
      throw AppError.badRequest('Valid avatar data or URL is required');
    }

    const fs = require('fs');
    const path = require('path');

    let avatarUrl = avatarData.trim();

    if (avatarUrl.startsWith('data:image/')) {
      const matches = avatarUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
      if (!matches) {
        throw AppError.badRequest('Invalid image format. Allowed formats: JPG, JPEG, PNG, WebP');
      }

      const ext = matches[1].toLowerCase() === 'jpeg' ? 'jpg' : matches[1].toLowerCase();
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (buffer.length > MAX_SIZE) {
        throw AppError.badRequest('Image size exceeds the maximum limit of 5MB');
      }

      const uploadsDir = path.resolve(__dirname, '../../uploads/avatars');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      avatarUrl = `/uploads/avatars/${fileName}`;
    } else if (!avatarUrl.startsWith('http://') && !avatarUrl.startsWith('https://') && !avatarUrl.startsWith('/uploads/')) {
      throw AppError.badRequest('Invalid image URL or image format');
    }

    const updatedUser = await userRepository.updateAvatar(userId, avatarUrl);
    if (!updatedUser) {
      throw AppError.notFound('User not found');
    }

    logger.info(`Avatar updated for user ${userId}: ${avatarUrl}`);
    return updatedUser.toJSON();
  }
}

module.exports = new AuthService();

