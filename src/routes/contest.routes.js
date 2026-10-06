const express = require('express');
const contestController = require('../controllers/contest.controller');
const cacheMiddleware = require('../middleware/cache.middleware');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();


router.get('/categorized', optionalAuth, cacheMiddleware(60), contestController.getCategorizedContests);


router.get('/stats', cacheMiddleware(300), contestController.getContestStats);


router.get('/:contestId', cacheMiddleware(300), contestController.getContestById);


router.get('/', cacheMiddleware(300), contestController.getContests);

module.exports = router;
