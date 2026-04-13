const authSchemas = require('./auth.validation');
const statsSchemas = require('./stats.validation');
const commonSchemas = require('./common.validation');

/**
 * Central export for all validation schemas.
 *
 * Usage:
 *   const { authSchemas, commonSchemas } = require('../validations');
 */
module.exports = {
  authSchemas,
  statsSchemas,
  commonSchemas,
};
