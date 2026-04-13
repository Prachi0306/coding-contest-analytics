const Joi = require('joi');

// ─── Custom Validators ─────────────────────────────────

/**
 * Custom Joi validator for MongoDB ObjectId strings.
 * Reusable across any schema that references a Mongo document.
 */
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('{{#label}} must be a valid MongoDB ObjectId');

// ─── Reusable Field Patterns ────────────────────────────

/**
 * Standard email pattern.
 */
const email = Joi.string()
  .email({ tlds: { allow: false } })
  .lowercase()
  .trim()
  .max(255);

/**
 * Standard username pattern.
 * 3-30 characters, alphanumeric + underscores/hyphens.
 */
const username = Joi.string()
  .pattern(/^[a-zA-Z0-9_-]+$/)
  .min(3)
  .max(30)
  .trim()
  .message('{{#label}} must contain only letters, numbers, underscores, and hyphens (3-30 characters)');

/**
 * Standard password pattern.
 * Minimum 8 characters, at least one uppercase, one lowercase, one number.
 */
const password = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .message('{{#label}} must be at least 8 characters with one uppercase, one lowercase, and one number');

/**
 * Platform handle (e.g. Codeforces or LeetCode username).
 * 1-64 characters, flexible to accommodate various platform naming rules.
 */
const platformHandle = Joi.string()
  .pattern(/^[a-zA-Z0-9_.-]+$/)
  .min(1)
  .max(64)
  .trim()
  .message('{{#label}} must contain only letters, numbers, underscores, dots, and hyphens');

// ─── Reusable Schema Fragments ──────────────────────────

/**
 * Validate route params that contain a MongoDB ObjectId (e.g. /users/:id).
 */
const objectIdParam = Joi.object({
  id: objectId.required().label('id'),
});

/**
 * Pagination query parameters — used on any list/search endpoint.
 */
const paginationQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1).label('page'),
  limit: Joi.number().integer().min(1).max(100).default(20).label('limit'),
  sortBy: Joi.string().trim().max(50).label('sortBy'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').label('sortOrder'),
});

/**
 * Handles (coding platform usernames) — reusable sub-schema.
 */
const handles = Joi.object({
  codeforces: platformHandle.label('codeforces handle'),
  leetcode: platformHandle.label('leetcode handle'),
}).min(0);

module.exports = {
  // Individual validators
  objectId,
  email,
  username,
  password,
  platformHandle,

  // Pre-built schemas
  objectIdParam,
  paginationQuery,
  handles,
};
