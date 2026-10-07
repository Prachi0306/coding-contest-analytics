const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.configured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    
    // SAFE DIAGNOSTICS
    logger.info('=== SMTP DIAGNOSTICS ===');
    logger.info(`SMTP_HOST configured: ${!!process.env.SMTP_HOST} (value: ${process.env.SMTP_HOST})`);
    logger.info(`SMTP_PORT configured: ${!!process.env.SMTP_PORT} (value: ${process.env.SMTP_PORT})`);
    logger.info(`SMTP_USER configured: ${!!process.env.SMTP_USER} (value: ${process.env.SMTP_USER})`);
    logger.info(`SMTP_PASS configured: ${!!process.env.SMTP_PASS}`);
    logger.info(`EMAIL_FROM configured: ${!!process.env.EMAIL_FROM}`);
    logger.info(`FRONTEND_URL configured: ${!!process.env.FRONTEND_URL}`);
    logger.info('========================');

    if (this.configured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000, // 10s to establish TCP connection
        greetingTimeout: 10000,   // 10s for SMTP greeting
        socketTimeout: 15000,     // 15s for socket inactivity
      });

      // Verify connection in the background
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('SMTP Connection/Auth Error: ' + error.message);
        } else {
          logger.info('SMTP Server is ready to take our messages');
        }
      });
    }
  }

  async sendVerificationEmail(to, token) {
    if (!this.configured) {
      const AppError = require('../utils/AppError');
      throw AppError.serviceUnavailable('Email delivery is currently unavailable. SMTP credentials are not configured.');
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"CodeContest Analytics" <noreply@example.com>',
        to,
        subject: 'Verify your email address',
        html: `
          <h1>Email Verification</h1>
          <p>Please click the link below to verify your email address:</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?email=${encodeURIComponent(to)}&token=${token}">Verify Email</a>
          <p>This link will expire in 15 minutes.</p>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${to}: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      const AppError = require('../utils/AppError');
      throw AppError.internal('Failed to send verification email. Please try again later.');
    }
  }
}

module.exports = new EmailService();
