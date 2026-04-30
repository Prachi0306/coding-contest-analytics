const express = require('express');
const statsController = require('../controllers/stats.controller');
const cacheMiddleware = require('../middleware/cache.middleware');

const router = express.Router();


router.get('/', cacheMiddleware(600), statsController.getLeaderboard);

module.exports = router;
