const express = require('express');
const contestController = require('../controllers/contest.controller');
const cacheMiddleware = require('../middleware/cache.middleware');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();


router.get('/categorized', optionalAuth, contestController.getCategorizedContests);


router.get('/stats', cacheMiddleware(3600), contestController.getContestStats);


router.get('/:contestId', cacheMiddleware(3600), contestController.getContestById);


router.get('/', cacheMiddleware(3600), contestController.getContests);

module.exports = router;
