const express = require('express');
const { param, body } = require('express-validator');
const upsolveController = require('../controllers/upsolve.controller');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

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
  [
    param('contestId').isMongoId().withMessage('Invalid contest ID format'),
  ],
  validate,
  upsolveController.getUpsolveList
);

/**
 * @route   PUT /api/upsolve/:contestId/:problemId
 * @desc    Update solve status of a problem
 * @access  Private
 */
router.put(
  '/:contestId/:problemId',
  [
    param('contestId').isMongoId().withMessage('Invalid contest ID format'),
    param('problemId').notEmpty().withMessage('Problem ID is required'),
    body('status').isIn(['solved', 'unsolved']).withMessage('Status must be solved or unsolved'),
  ],
  validate,
  upsolveController.updateSolveStatus
);

module.exports = router;
