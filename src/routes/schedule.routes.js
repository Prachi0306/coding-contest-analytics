const express = require('express');
const Joi = require('joi');
const scheduleController = require('../controllers/schedule.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();


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

router.use(authenticate);


router.post('/star', validate(contestIdBodySchema), scheduleController.addBookmark);


router.delete('/unstar', validate(contestIdBodySchema), scheduleController.removeBookmark);


router.get('/', scheduleController.getSchedule);

module.exports = router;
