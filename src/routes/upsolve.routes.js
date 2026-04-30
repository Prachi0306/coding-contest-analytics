const express = require('express');
const Joi = require('joi');
const upsolveController = require('../controllers/upsolve.controller');
const { authenticate } = require('../middleware/auth');
const { validate, validateMultiple } = require('../middleware/validate');

const router = express.Router();


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

router.use(authenticate);


router.get('/stats', upsolveController.getUpsolveStats);


router.get('/contests', upsolveController.getContestsWithProblems);


router.get(
  '/:contestId',
  validateMultiple({ params: contestIdParamsSchema }),
  upsolveController.getUpsolveList
);


router.put(
  '/:contestId/:problemId',
  validateMultiple({
    params: updateStatusParamsSchema,
    body: updateStatusBodySchema,
  }),
  upsolveController.updateSolveStatus
);

module.exports = router;
