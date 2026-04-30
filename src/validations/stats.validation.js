const Joi = require('joi');
const { objectId, paginationQuery } = require('./common.validation');


const statsParams = Joi.object({
  userId: objectId.required().label('userId'),
});


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
