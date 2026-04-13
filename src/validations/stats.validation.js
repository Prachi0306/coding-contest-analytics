const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.validation');

// ─── Stats Validation Schemas ───────────────────────────

/**
 * GET /api/stats/:userId
 * Params validation for user stats lookup.
 */
const statsParams = Joi.object({
  userId: objectId.required().label('userId'),
});

/**
 * GET /api/stats/:userId
 * Query filters for stats endpoint.
 */
const statsQuery = Joi.object({
  platform: Joi.string()
    .valid('codeforces', 'leetcode')
    .label('platform'),
  from: Joi.date()
    .iso()
    .label('from'),
  to: Joi.date()
    .iso()
    .min(Joi.ref('from'))
    .label('to')
    .messages({ 'date.min': '"to" must be after "from"' }),
}).and('from', 'to').messages({
  'object.and': 'Both "from" and "to" date filters must be provided together',
}).options({ allowUnknown: false });

/**
 * GET /api/leaderboard
 * Query params for leaderboard endpoint.
 */
const leaderboardQuery = paginationQuery.keys({
  platform: Joi.string()
    .valid('codeforces', 'leetcode')
    .default('codeforces')
    .label('platform'),
  period: Joi.string()
    .valid('all', '30d', '90d', '1y')
    .default('all')
    .label('period'),
});

module.exports = {
  statsParams,
  statsQuery,
  leaderboardQuery,
};
