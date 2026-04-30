const express = require('express');
const syncController = require('../controllers/sync.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();



router.post('/contests', authenticate, syncController.syncContests);


router.post('/my-ratings', authenticate, syncController.syncMyRatings);

module.exports = router;
