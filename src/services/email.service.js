const { Resend } = require('resend');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.configured = !!process.env.RESEND_API_KEY;

    logger.info('=== Email Service DIAGNOSTICS ===');
    logger.info(`RESEND_API_KEY configured: ${!!process.env.RESEND_API_KEY}`);
    logger.info(`EMAIL_FROM configured: ${!!process.env.EMAIL_FROM} (value: ${process.env.EMAIL_FROM || 'not set'})`);
    logger.info(`FRONTEND_URL configured: ${!!process.env.FRONTEND_URL}`);
    logger.info('=================================');

    if (this.configured) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      logger.info('Resend email client initialized');
    }
  }

  async sendVerificationEmail(to, token) {
    if (!this.configured) {
      const AppError = require('../utils/AppError');
      throw AppError.serviceUnavailable('Email delivery is currently unavailable. RESEND_API_KEY is not configured.');
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?email=${encodeURIComponent(to)}&token=${token}`;

      const { data, error } = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || 'CodeContest Analytics <onboarding@resend.dev>',
        to: [to],
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${verificationUrl}">Verify Email</a>
          <p>This link will expire in 15 minutes.</p>
        `,
      });

      if (error) {
        logger.error(`Resend API error sending to ${to}: ${error.message}`);
        const AppError = require('../utils/AppError');
        throw AppError.internal('Failed to send verification email. Please try again later.');
      }

      logger.info(`Verification email sent to ${to}: ${data.id}`);
      return true;
    } catch (error) {
      // Re-throw AppError instances as-is
      if (error.isOperational) {
        throw error;
      }
      logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      const AppError = require('../utils/AppError');
      throw AppError.internal('Failed to send verification email. Please try again later.');
    }
  }
}

module.exports = new EmailService();
