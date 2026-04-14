const User = require('./User');
const Contest = require('./Contest');
const UserStats = require('./UserStats');

/**
 * Central export for all Mongoose models.
 *
 * Usage:
 *   const { User, Contest, UserStats } = require('../models');
 */
module.exports = {
  User,
  Contest,
  UserStats,
};
