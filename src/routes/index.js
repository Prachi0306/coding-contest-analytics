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



router.use('/health', healthRoutes);

router.use('/auth', authRoutes);

router.use('/contests', contestRoutes);

router.use('/stats', statsRoutes);

router.use('/sync', syncRoutes);

router.use('/leaderboard', leaderboardRoutes);

router.use('/platforms', platformRoutes);

router.use('/schedule', scheduleRoutes);

router.use('/calendar', calendarRoutes);

router.use('/upsolve', upsolveRoutes);

module.exports = router;

