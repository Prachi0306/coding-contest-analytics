const codeforcesService = require('../codeforces.service');
const logger = require('../../utils/logger');

/**
 * Codeforces Platform Service (Wrapper).
 *
 * Adapts the EXISTING CodeforcesService to the standard
 * multi-platform response contract.
 *
 * ⚠️  This file does NOT replicate any Codeforces logic.
 *     It delegates entirely to `src/services/codeforces.service.js`.
 */

const PLATFORM = 'codeforces';

/**
 * Build a standard platform response.
 * @returns {object} Standard response shape
 */
function _buildResponse(overrides = {}) {
  return {
    platform: PLATFORM,
    status: 'success',
    handle: '',
    rating: null,
    maxRating: null,
    contests: [],
    submissions: [],
    tags: {},
    error: null,
    ...overrides,
  };
}

/**
 * Aggregate tag counts from an array of submissions.
 * @param {Array} submissions - Normalized submissions from codeforces.service
 * @returns {object} { tagName: count, ... }
 */
function _aggregateTags(submissions) {
  const tagMap = {};
  for (const sub of submissions) {
    if (sub.verdict !== 'OK') continue; // Only count accepted solutions
    const tags = sub.problem?.tags || [];
    for (const tag of tags) {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }
  }
  return tagMap;
}

/**
 * Fetch full profile data for a Codeforces user.
 *
 * @param {string} handle - Codeforces username
 * @returns {Promise<object>} Standard platform response — NEVER throws
 */
async function fetchProfile(handle) {
  if (!handle || typeof handle !== 'string' || !handle.trim()) {
    return _buildResponse({
      handle: handle || '',
      status: 'failed',
      error: 'Invalid or empty Codeforces handle',
    });
  }

  const trimmedHandle = handle.trim();

  try {
    // ─── Parallel fetch for speed ──────────────────
    const [userInfo, ratingHistory, submissions] = await Promise.allSettled([
      codeforcesService.getUserInfo(trimmedHandle),
      codeforcesService.getUserRatingHistory(trimmedHandle),
      codeforcesService.getUserSubmissions(trimmedHandle, 500),
    ]);

    // ─── Extract results (safe) ────────────────────
    const info = userInfo.status === 'fulfilled' ? userInfo.value : null;
    const ratings = ratingHistory.status === 'fulfilled' ? ratingHistory.value : [];
    const subs = submissions.status === 'fulfilled' ? submissions.value : [];

    // If we couldn't even get basic user info, treat as a partial failure
    if (!info) {
      logger.warn(`Codeforces: user info fetch failed for ${trimmedHandle}`, {
        reason: userInfo.reason?.message,
      });
    }

    const tags = _aggregateTags(subs);

    return _buildResponse({
      handle: trimmedHandle,
      rating: info?.rating ?? null,
      maxRating: info?.maxRating ?? null,
      contests: ratings,
      submissions: subs,
      tags,
    });
  } catch (error) {
    // Catch-all — should never reach here because of allSettled,
    // but we guarantee no throws regardless.
    logger.error(`Codeforces platform service error for ${trimmedHandle}`, {
      error: error.message,
    });

    return _buildResponse({
      handle: trimmedHandle,
      status: 'failed',
      error: error.message || 'Unknown Codeforces error',
    });
  }
}

module.exports = { fetchProfile, PLATFORM };
