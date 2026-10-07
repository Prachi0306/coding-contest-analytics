const axios = require('axios');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.configured = !!process.env.BREVO_API_KEY;

    logger.info('=== Email Service DIAGNOSTICS ===');
    logger.info(`BREVO_API_KEY configured: ${!!process.env.BREVO_API_KEY}`);
    logger.info(`EMAIL_FROM configured: ${!!process.env.EMAIL_FROM} (value: ${process.env.EMAIL_FROM || 'not set'})`);
    logger.info(`FRONTEND_URL configured: ${!!process.env.FRONTEND_URL}`);
    logger.info('=================================');
  }

  async sendVerificationEmail(to, token) {
    if (!this.configured) {
      const AppError = require('../utils/AppError');
      throw AppError.serviceUnavailable('Email delivery is currently unavailable. BREVO_API_KEY is not configured.');
    }

    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?email=${encodeURIComponent(to)}&token=${token}`;

      const response = await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            name: 'CodeContest Analytics',
            email: process.env.EMAIL_FROM
          },
          to: [
            {
              email: to
            }
          ],
          subject: 'Verify your email address',
          htmlContent: `
            <h1>Email Verification</h1>
            <p>Please click the link below to verify your email address:</p>
            <a href="${verificationUrl}">Verify Email</a>
            <p>This link will expire in 15 minutes.</p>
          `
        },
        {
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
          },
          timeout: 10000 // 10 seconds timeout
        }
      );

      logger.info(`Verification email sent to ${to}: ${response.data.messageId}`);
      return true;
    } catch (error) {
      // Re-throw AppError instances as-is
      if (error.isOperational) {
        throw error;
      }
      
      const errorMessage = error.response?.data?.message || error.message;
      logger.error(`Failed to send verification email to ${to}: ${errorMessage}`);
      const AppError = require('../utils/AppError');
      throw AppError.internal('Failed to send verification email. Please try again later.');
    }
  }
}

module.exports = new EmailService();
