const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authSchemas } = require('../validations');
const rateLimit = require('express-rate-limit');

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for verification
  message: { status: 'error', message: 'Too many verification attempts. Please try again later.' }
});

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Limit each IP to 3 resend requests per window
  message: { status: 'error', message: 'Too many resend attempts. Please try again later.' }
});

const router = express.Router();


router.post(
  '/register',
  validate(authSchemas.register),
  authController.register
);

router.post(
  '/verify-email',
  verifyLimiter,
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  resendLimiter,
  authController.resendVerification
);


router.post(
  '/login',
  validate(authSchemas.login),
  authController.login
);



router.put(
  '/change-password',
  authenticate,
  validate(authSchemas.changePassword),
  authController.changePassword
);


router.put(
  '/username',
  authenticate,
  authController.updateUsername
);


router.put(
  '/avatar',
  authenticate,
  authController.updateAvatar
);


router.get(
  '/me',
  authenticate,
  authController.getProfile
);

module.exports = router;
