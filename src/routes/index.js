const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');

const router = express.Router();

/**
 * Central route index — all route modules are mounted here.
 * New route modules should be added below as the project grows.
 */

// Health check
router.use('/health', healthRoutes);

// Authentication
router.use('/auth', authRoutes);

// Future route mounts:
// router.use('/stats', statsRoutes);     // Phase 4
// router.use('/leaderboard', lbRoutes); // Phase 4

module.exports = router;
