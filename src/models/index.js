const User = require('./User');
const Contest = require('./Contest');

/**
 * Central export for all Mongoose models.
 *
 * Usage:
 *   const { User, Contest } = require('../models');
 */
module.exports = {
  User,
  Contest,
};
