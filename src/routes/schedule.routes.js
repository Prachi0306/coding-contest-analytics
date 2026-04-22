const express = require('express');
const { body } = require('express-validator');
const scheduleController = require('../controllers/schedule.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// All schedule routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/schedule/star
 * @desc    Add a contest to the user's schedule
 * @access  Private
 */
router.post(
  '/star',
  [
    body('contestId').notEmpty().withMessage('contestId is required').isMongoId().withMessage('Invalid contest ID format'),
  ],
  validate,
  scheduleController.addBookmark
);

/**
 * @route   DELETE /api/schedule/unstar
 * @desc    Remove a contest from the user's schedule
 * @access  Private
 */
router.delete(
  '/unstar',
  [
    body('contestId').notEmpty().withMessage('contestId is required').isMongoId().withMessage('Invalid contest ID format'),
  ],
  validate,
  scheduleController.removeBookmark
);

/**
 * @route   GET /api/schedule
 * @desc    Get user's complete schedule sorted by start time
 * @access  Private
 */
router.get('/', scheduleController.getSchedule);

module.exports = router;
