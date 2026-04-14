const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const contestRoutes = require('./contest.routes');
const statsRoutes = require('./stats.routes');
const syncRoutes = require('./sync.routes');

const router = express.Router();

/**
 * Central route index — all route modules are mounted here.
 * New route modules should be added below as the project grows.
 */

// Health check
router.use('/health', healthRoutes);

// Authentication
router.use('/auth', authRoutes);

// Contests
router.use('/contests', contestRoutes);

// User Stats / Analytics
router.use('/stats', statsRoutes);

// Data Sync
router.use('/sync', syncRoutes);

module.exports = router;

