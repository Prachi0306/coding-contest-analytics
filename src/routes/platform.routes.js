const express = require('express');
const { authenticate } = require('../middleware/auth');
const platformController = require('../controllers/platform.controller');
const cacheMiddleware = require('../middleware/cache.middleware');

const router = express.Router();


router.get('/profile', authenticate, cacheMiddleware(300), platformController.getProfile);

router.get('/status', authenticate, platformController.getConnectionStatus);

router.post('/connect', authenticate, platformController.connectPlatforms);

module.exports = router;
