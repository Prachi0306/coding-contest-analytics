const Joi = require('joi');


const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('{{#label}} must be a valid MongoDB ObjectId');


const email = Joi.string()
  .email({ tlds: { allow: false } })
  .lowercase()
  .trim()
  .max(255);


const username = Joi.string()
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .min(3)
  .max(30)
  .trim()
  .message('{{#label}} must contain only letters, numbers, underscores, and hyphens (3-30 characters)');


const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message('{{#label}} must be at least 8 characters with one uppercase, one lowercase, and one number');


const platformHandle = Joi.string()
  .pattern(/^[a-zA-Z0-9_.-]+$/)
  .min(1)
  .max(64)
  .trim()
  .message('{{#label}} must contain only letters, numbers, underscores, dots, and hyphens');


const objectIdParam = Joi.object({
  id: objectId.required().label('id'),
});


const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1).label('page'),
  limit: Joi.number().integer().min(1).max(100).default(20).label('limit'),
  sortBy: Joi.string().trim().max(50).label('sortBy'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').label('sortOrder'),
});


const handles = Joi.object({
  codeforces: platformHandle.label('codeforces handle'),
  leetcode: platformHandle.label('leetcode handle'),
}).min(0);

module.exports = {
  objectId,
  email,
  username,
  password,
  platformHandle,

  objectIdParam,
  paginationQuery,
  handles,
};
