const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * CodeChef Platform Service.
 *
 * Fetches user profile data from CodeChef's public API.
 * Falls back to a secondary endpoint if the primary one fails.
 *
 * Implements:
 *   • Retry logic (max 2 retries)
 *   • Timeout handling (10s)
 *   • Parsing failure → safe failure response
 *   • Standard response contract (NEVER throws)
 */

const PLATFORM = 'codechef';
const CODECHEF_API_BASE = 'https://codechef-api.vercel.app/handle';
const REQUEST_TIMEOUT = 10000; // 10s
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1s base

// ─── Helpers ──────────────────────────────────────────

function _sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * Make an HTTP request with retry logic.
 *
 * @param {string} url - Request URL
 * @param {number} [attempt=0] - Current retry attempt
 * @returns {Promise<object>} Response data
 */
async function _requestWithRetry(url, attempt = 0) {
  try {
    const response = await axios.get(url, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'CodingContestAnalytics/1.0',
        Accept: 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      const isRetryable =
        !error.response || // network error
        error.response.status >= 500 ||
        error.response.status === 429 ||
        error.code === 'ECONNABORTED';

      if (isRetryable) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        logger.warn(
          `CodeChef API retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`,
          { error: error.message }
        );
        await _sleep(delay);
        return _requestWithRetry(url, attempt + 1);
      }
    }

    // Not retryable or retries exhausted
    throw error;
  }
}

/**
 * Parse rating history / contest participation from CodeChef API response.
 * @param {object} data - Raw API data
 * @returns {Array} Normalized contest entries
 */
function _parseContests(data) {
  try {
    const ratingData = data.ratingData || [];
    return ratingData.map((entry) => ({
      contestName: entry.name || entry.code || 'Unknown',
      contestCode: entry.code || null,
      rating: parseInt(entry.rating, 10) || null,
      rank: parseInt(entry.rank, 10) || null,
      timestamp: entry.end_date
        ? new Date(entry.end_date).toISOString()
        : null,
    }));
  } catch (error) {
    logger.warn('CodeChef: failed to parse contest data', { error: error.message });
    return [];
  }
}

/**
 * Parse problem statistics from CodeChef API response.
 * @param {object} data - Raw API data
 * @returns {object} { totalSolved, submissions array }
 */
function _parseSubmissions(data) {
  try {
    // The public API returns fully solved / partially solved counts
    const submissions = [];

    if (data.fullySolved) {
      submissions.push({
        difficulty: 'fullySolved',
        count: parseInt(data.fullySolved, 10) || 0,
      });
    }
    if (data.partiallySolved) {
      submissions.push({
        difficulty: 'partiallySolved',
        count: parseInt(data.partiallySolved, 10) || 0,
      });
    }

    return submissions;
  } catch (error) {
    logger.warn('CodeChef: failed to parse submission data', { error: error.message });
    return [];
  }
}

// ─── Public API ───────────────────────────────────────

/**
 * Fetch full profile data for a CodeChef user.
 *
 * @param {string} handle - CodeChef username
 * @returns {Promise<object>} Standard platform response — NEVER throws
 */
async function fetchProfile(handle) {
  if (!handle || typeof handle !== 'string' || !handle.trim()) {
    return _buildResponse({
      handle: handle || '',
      status: 'failed',
      error: 'Invalid or empty CodeChef handle',
    });
  }

  const trimmedHandle = handle.trim();

  try {
    // ─── Primary API call ──────────────────────────
    const data = await _requestWithRetry(`${CODECHEF_API_BASE}/${trimmedHandle}`);

    // ─── Handle not found ──────────────────────────
    if (!data || data.success === false || data.status === 404) {
      return _buildResponse({
        handle: trimmedHandle,
        status: 'failed',
        error: `CodeChef user "${trimmedHandle}" not found`,
      });
    }

    // ─── Parse rating ──────────────────────────────
    const currentRating = parseInt(data.currentRating, 10) || null;
    const highestRating = parseInt(data.highestRating, 10) || null;

    // ─── Parse contests ────────────────────────────
    const contests = _parseContests(data);

    // ─── Parse submissions ─────────────────────────
    const submissions = _parseSubmissions(data);

    // ─── Tags (CodeChef doesn't expose granular tags via public API) ──
    // We leave them empty — the tag analytics pipeline can fill them later
    // if we add problem-level scraping.
    const tags = {};

    return _buildResponse({
      handle: trimmedHandle,
      rating: currentRating,
      maxRating: highestRating,
      contests,
      submissions,
      tags,
    });
  } catch (error) {
    logger.error(`CodeChef platform service error for ${trimmedHandle}`, {
      error: error.message,
    });

    return _buildResponse({
      handle: trimmedHandle,
      status: 'failed',
      error: error.message || 'Unknown CodeChef error',
    });
  }
}

module.exports = { fetchProfile, PLATFORM };
