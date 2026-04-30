const express = require('express');
const { authenticate } = require('../middleware/auth');
const platformController = require('../controllers/platform.controller');

const router = express.Router();


router.get('/profile', authenticate, platformController.getProfile);

router.get('/status', authenticate, platformController.getConnectionStatus);

router.post('/connect', authenticate, platformController.connectPlatforms);

module.exports = router;
