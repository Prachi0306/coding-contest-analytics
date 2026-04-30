const express = require('express');
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cache.middleware');

const router = express.Router();



router.get('/rating-history', authenticate, cacheMiddleware(300), statsController.getRatingHistory);


router.get('/summary', authenticate, cacheMiddleware(300), statsController.getStatsSummary);


router.get('/contest-history', authenticate, cacheMiddleware(300), statsController.getContestHistory);


router.get('/latest-rating', authenticate, cacheMiddleware(300), statsController.getLatestRating);


router.get('/codeforces-profile', authenticate, cacheMiddleware(900), statsController.getCodeforcesProfile);

module.exports = router;
