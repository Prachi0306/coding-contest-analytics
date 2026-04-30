const express = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authSchemas } = require('../validations');

const router = express.Router();


router.post(
  '/register',
  validate(authSchemas.register),
  authController.register
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


router.get(
  '/me',
  authenticate,
  authController.getProfile
);

module.exports = router;
