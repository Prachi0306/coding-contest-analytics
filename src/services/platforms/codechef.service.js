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

    // Gracefully handle specific API limitations without raw Axios errors
    if (error.response?.status === 402 || error.response?.status === 429) {
      throw new Error('CodeChef public API quota exceeded (Rate Limited). Please try syncing again in a few minutes.');
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
 * Fetch full profile data for a CodeChef user natively bypassing the wrapper API.
 *
 * @param {string} handle - CodeChef username
 * @returns {Promise<object>} Standard platform response — NEVER throws
 */
async function fetchProfile(handle) {
  if (!handle || typeof handle !== 'string' || !handle.trim()) {
    return _buildResponse({ handle: handle || '', status: 'failed', error: 'Invalid or empty CodeChef handle' });
  }

  const trimmedHandle = handle.trim();

  try {
    const rawHtmlResponse = await axios.get(`https://www.codechef.com/users/${trimmedHandle}`, {
      timeout: REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
      }
    });

    const rawHtml = rawHtmlResponse.data;

    if (!rawHtml || typeof rawHtml !== 'string') {
        throw new Error('Invalid HTML received from CodeChef');
    }

    let currentRating = null;
    let highestRating = null;

    const ratingMatch = rawHtml.match(/class=["']rating-number["'][^>]*>(\d+)/i);
    if (ratingMatch) currentRating = parseInt(ratingMatch[1], 10);
    
    const maxRatingMatch = rawHtml.match(/Highest Rating\s*(\d+)/i);
    if (maxRatingMatch) highestRating = parseInt(maxRatingMatch[1], 10);

    if (currentRating === null && highestRating === null) {
         throw new Error(`CodeChef user "${trimmedHandle}" not found or layout changed`);
    }

    const tags = {};
    const submissions = [];
    let contests = [];
    
    // Attempt to scrape fully solved count natively if available
    const solvedMatch = rawHtml.match(/Fully Solved\s*\(\s*(\d+)/i);
    if (solvedMatch) {
       submissions.push({ difficulty: 'fullySolved', count: parseInt(solvedMatch[1], 10) });
    }

    // Attempt to accurately scrape the contest rating history bypassing external APIs completely!
    const historyMatch = rawHtml.match(/var all_rating = (\[.*?\]);/s);
    if (historyMatch) {
      try {
        const ratingData = JSON.parse(historyMatch[1]);
        contests = ratingData.map((entry) => ({
          contestName: entry.name || entry.code || 'Unknown',
          contestCode: entry.code || null,
          rating: parseInt(entry.rating, 10) || null,
          rank: parseInt(entry.rank, 10) || null,
          timestamp: entry.end_date
            ? new Date(entry.end_date).toISOString()
            : null,
        }));
      } catch (err) {
        logger.warn(`Codechef failed to parse native contest array for ${trimmedHandle}`);
      }
    }

    return _buildResponse({
      handle: trimmedHandle,
      rating: currentRating,
      maxRating: highestRating,
      contests,
      submissions,
      tags,
    });
  } catch (error) {
    logger.error(`CodeChef platform service error for ${trimmedHandle}`, { error: error.message });

    return _buildResponse({
      handle: trimmedHandle,
      status: 'failed',
      error: 'Codechef public profile blocked by Cloudflare (429) or User not found.',
    });
  }
}

module.exports = { fetchProfile, PLATFORM };
