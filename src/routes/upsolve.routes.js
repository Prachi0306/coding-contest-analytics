const express = require('express');
const Joi = require('joi');
const upsolveController = require('../controllers/upsolve.controller');
const { authenticate } = require('../middleware/auth');
const { validate, validateMultiple } = require('../middleware/validate');

const router = express.Router();

// ─── Validation Schemas ──────────────────────────────────────────────────────

const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId' });

const contestIdParamsSchema = Joi.object({
  contestId: objectId.required().label('contestId'),
});

const updateStatusParamsSchema = Joi.object({
  contestId: objectId.required().label('contestId'),
  problemId: Joi.string().trim().min(1).required().label('problemId'),
});

const updateStatusBodySchema = Joi.object({
  status: Joi.string().valid('solved', 'unsolved').required().label('status'),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

// All upsolve routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/upsolve/stats
 * @desc    Get aggregate upsolving stats for the user
 * @access  Private
 */
router.get('/stats', upsolveController.getUpsolveStats);

/**
 * @route   GET /api/upsolve/contests
 * @desc    Get contests that have problems registered
 * @access  Private
 */
router.get('/contests', upsolveController.getContestsWithProblems);

/**
 * @route   GET /api/upsolve/:contestId
 * @desc    Get upsolve list for a specific contest
 * @access  Private
 */
router.get(
  '/:contestId',
  validateMultiple({ params: contestIdParamsSchema }),
  upsolveController.getUpsolveList
);

/**
 * @route   PUT /api/upsolve/:contestId/:problemId
 * @desc    Update solve status of a problem
 * @access  Private
 */
router.put(
  '/:contestId/:problemId',
  validateMultiple({
    params: updateStatusParamsSchema,
    body: updateStatusBodySchema,
  }),
  upsolveController.updateSolveStatus
);

module.exports = router;
