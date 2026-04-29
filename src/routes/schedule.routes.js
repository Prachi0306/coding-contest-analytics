const express = require('express');
const Joi = require('joi');
const scheduleController = require('../controllers/schedule.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// ─── Validation Schemas ──────────────────────────────────────────────────────

const contestIdBodySchema = Joi.object({
  contestId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .label('contestId')
    .messages({
      'string.pattern.base': 'contestId must be a valid MongoDB ObjectId',
      'any.required': 'contestId is required',
    }),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// All schedule routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/schedule/star
 * @desc    Add a contest to the user's schedule
 * @access  Private
 */
router.post('/star', validate(contestIdBodySchema), scheduleController.addBookmark);

/**
 * @route   DELETE /api/schedule/unstar
 * @desc    Remove a contest from the user's schedule
 * @access  Private
 */
router.delete('/unstar', validate(contestIdBodySchema), scheduleController.removeBookmark);

/**
 * @route   GET /api/schedule
 * @desc    Get user's complete schedule sorted by start time
 * @access  Private
 */
router.get('/', scheduleController.getSchedule);

module.exports = router;
