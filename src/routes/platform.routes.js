const express = require('express');
const { authenticate } = require('../middleware/auth');
const platformController = require('../controllers/platform.controller');

const router = express.Router();

/**
 * Platform Routes — multi-platform profile management.
 * All routes require authentication.
 *
 * GET  /api/platforms/profile  → Aggregated profile from all connected platforms
 * GET  /api/platforms/status   → Check which platforms are connected
 * POST /api/platforms/connect  → Connect / update platform handles
 */

// Fetch aggregated profile data from all connected platforms
router.get('/profile', authenticate, platformController.getProfile);

// Check which platforms are connected
router.get('/status', authenticate, platformController.getConnectionStatus);

// Connect / update platform handles
router.post('/connect', authenticate, platformController.connectPlatforms);

module.exports = router;
