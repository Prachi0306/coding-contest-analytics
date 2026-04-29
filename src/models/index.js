const User = require('./User');
const Contest = require('./Contest');
const UserStats = require('./UserStats');
const Bookmark = require('./Bookmark');
const SyncLog = require('./SyncLog');
const Problem = require('./Problem');
const Submission = require('./Submission');

/**
 * Central export for all Mongoose models.
 *
 * Usage:
 *   const { User, Contest, UserStats, Problem, Submission } = require('../models');
 */
module.exports = {
  User,
  Contest,
  UserStats,
  Bookmark,
  SyncLog,
  Problem,
  Submission,
};
