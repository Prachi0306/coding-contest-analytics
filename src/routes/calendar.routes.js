const express = require('express');
const { downloadCalendarICS } = require('../controllers/calendar.controller');

const router = express.Router();

/**
 * @route   GET /api/calendar/:contestId
 * @desc    Generate and download an .ics file for a contest
 * @access  Public
 */
router.get('/:contestId', downloadCalendarICS);

module.exports = router;
