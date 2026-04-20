/**
 * Platform Services — Barrel Export & Registry.
 *
 * Each platform service is isolated and self-contained.
 * All services implement the same interface:
 *
 *   { fetchProfile(handle): Promise<StandardResponse> }
 *
 * To add a new platform:
 *   1. Create <platform>.service.js in this directory
 *   2. Add it to the `platformServices` map below
 *   3. Done — the aggregator will pick it up automatically
 */

const codeforcesService = require('./codeforces.service');
const leetcodeService = require('./leetcode.service');
const codechefService = require('./codechef.service');

/**
 * Platform service registry.
 * Key = platform identifier (must match `platformHandles` field names in User model).
 */
const platformServices = {
  codeforces: codeforcesService,
  leetcode: leetcodeService,
  codechef: codechefService,
};

/**
 * Get a platform service by name.
 * @param {string} platform - Platform identifier
 * @returns {object|null} Service module or null if unknown
 */
function getPlatformService(platform) {
  return platformServices[platform] || null;
}

/**
 * Get all registered platform identifiers.
 * @returns {string[]} Array of platform names
 */
function getAllPlatforms() {
  return Object.keys(platformServices);
}

module.exports = {
  platformServices,
  getPlatformService,
  getAllPlatforms,
  codeforcesService,
  leetcodeService,
  codechefService,
};
