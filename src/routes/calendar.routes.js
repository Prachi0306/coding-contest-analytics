const express = require('express');
const { downloadCalendarICS } = require('../controllers/calendar.controller');

const router = express.Router();


router.get('/:contestId', downloadCalendarICS);

module.exports = router;
