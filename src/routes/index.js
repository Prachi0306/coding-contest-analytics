const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const contestRoutes = require('./contest.routes');
const statsRoutes = require('./stats.routes');
const syncRoutes = require('./sync.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const platformRoutes = require('./platform.routes');
const scheduleRoutes = require('./schedule.routes');
const calendarRoutes = require('./calendar.routes');
const upsolveRoutes = require('./upsolve.routes');

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

// Leaderboard
router.use('/leaderboard', leaderboardRoutes);

// Multi-Platform Profiles
router.use('/platforms', platformRoutes);

// Schedule (Bookmarks)
router.use('/schedule', scheduleRoutes);

// Calendar (ICS generation)
router.use('/calendar', calendarRoutes);

// Upsolving Tracker
router.use('/upsolve', upsolveRoutes);

module.exports = router;

