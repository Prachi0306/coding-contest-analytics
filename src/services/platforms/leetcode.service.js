const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * LeetCode Platform Service.
 *
 * Fetches user profile data from LeetCode's public GraphQL API.
 * Implements:
 *   • Retry logic (max 2 retries)
 *   • Timeout handling (10s)
 *   • Private profile detection
 *   • Standard response contract (NEVER throws)
 */

const PLATFORM = 'leetcode';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';
const REQUEST_TIMEOUT = 10000; // 10s
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1s base

// ─── GraphQL Queries ──────────────────────────────────

const USER_PROFILE_QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile {
        ranking
        reputation
        starRating
      }
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
      tagProblemCounts {
        advanced {
          tagName
          tagSlug
          problemsSolved
        }
        intermediate {
          tagName
          tagSlug
          problemsSolved
        }
        fundamental {
          tagName
          tagSlug
          problemsSolved
        }
      }
    }
  }
`;

const USER_CONTEST_QUERY = `
  query userContestRankingInfo($username: String!) {
    userContestRanking(username: $username) {
      attendedContestsCount
      rating
      globalRanking
      topPercentage
    }
    userContestRankingHistory(username: $username) {
      attended
      rating
      ranking
      trendDirection
      problemsSolved
      totalProblems
      finishTimeInSeconds
      contest {
        title
        startTime
      }
    }
  }
`;

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
 * Execute a GraphQL request against LeetCode with retry.
 *
 * @param {string} query - GraphQL query string
 * @param {object} variables - Query variables
 * @param {number} [attempt=0] - Current retry attempt
 * @returns {Promise<object>} Response data
 */
async function _graphqlRequest(query, variables, attempt = 0) {
  try {
    const response = await axios.post(
      LEETCODE_GRAPHQL_URL,
      { query, variables },
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CodingContestAnalytics/1.0',
          'Referer': 'https://leetcode.com',
        },
      }
    );

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
          `LeetCode GraphQL retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`,
          { error: error.message }
        );
        await _sleep(delay);
        return _graphqlRequest(query, variables, attempt + 1);
      }
    }

    // Not retryable or retries exhausted
    throw error;
  }
}

/**
 * Parse tag counts from LeetCode's tagProblemCounts structure.
 * @param {object} tagProblemCounts
 * @returns {object} { tagName: totalSolved, ... }
 */
function _parseTags(tagProblemCounts) {
  const tags = {};
  if (!tagProblemCounts) return tags;

  const levels = ['fundamental', 'intermediate', 'advanced'];
  for (const level of levels) {
    const items = tagProblemCounts[level] || [];
    for (const item of items) {
      if (item.problemsSolved > 0) {
        tags[item.tagName] = (tags[item.tagName] || 0) + item.problemsSolved;
      }
    }
  }
  return tags;
}

/**
 * Normalize contest history from LeetCode.
 * @param {Array} history - userContestRankingHistory entries
 * @returns {Array} Normalized contest entries
 */
function _normalizeContests(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((entry) => entry.attended)
    .map((entry) => ({
      contestName: entry.contest?.title || 'Unknown',
      rank: entry.ranking || null,
      rating: Math.round(entry.rating || 0),
      problemsSolved: entry.problemsSolved || 0,
      totalProblems: entry.totalProblems || 0,
      timestamp: entry.contest?.startTime
        ? new Date(entry.contest.startTime * 1000).toISOString()
        : null,
    }));
}

// ─── Public API ───────────────────────────────────────

/**
 * Fetch full profile data for a LeetCode user.
 *
 * @param {string} handle - LeetCode username
 * @returns {Promise<object>} Standard platform response — NEVER throws
 */
async function fetchProfile(handle) {
  if (!handle || typeof handle !== 'string' || !handle.trim()) {
    return _buildResponse({
      handle: handle || '',
      status: 'failed',
      error: 'Invalid or empty LeetCode handle',
    });
  }

  const trimmedHandle = handle.trim();

  try {
    // ─── Parallel GraphQL queries ─────────────────
    const [profileRes, contestRes] = await Promise.allSettled([
      _graphqlRequest(USER_PROFILE_QUERY, { username: trimmedHandle }),
      _graphqlRequest(USER_CONTEST_QUERY, { username: trimmedHandle }),
    ]);

    // ─── Profile data ─────────────────────────────
    const profileData = profileRes.status === 'fulfilled' ? profileRes.value : null;
    const matchedUser = profileData?.data?.matchedUser;

    // Private or non-existent profile
    if (profileRes.status === 'fulfilled' && !matchedUser) {
      return _buildResponse({
        handle: trimmedHandle,
        status: 'failed',
        error: `LeetCode user "${trimmedHandle}" not found or profile is private`,
      });
    }

    // ─── Contest data ─────────────────────────────
    const contestData = contestRes.status === 'fulfilled' ? contestRes.value : null;
    const contestRanking = contestData?.data?.userContestRanking;
    const contestHistory = contestData?.data?.userContestRankingHistory || [];

    // ─── Compute rating ───────────────────────────
    const rating = contestRanking?.rating ? Math.round(contestRanking.rating) : null;

    // LeetCode doesn't expose maxRating directly — derive from history
    let maxRating = null;
    if (contestHistory.length > 0) {
      const attendedRatings = contestHistory
        .filter((e) => e.attended && e.rating)
        .map((e) => Math.round(e.rating));
      if (attendedRatings.length > 0) {
        maxRating = Math.max(...attendedRatings);
      }
    }

    // ─── Tags ─────────────────────────────────────
    const tags = _parseTags(matchedUser?.tagProblemCounts);

    // ─── Submissions summary ──────────────────────
    const submitStats = matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
    const submissions = submitStats.map((s) => ({
      difficulty: s.difficulty,
      count: s.count,
      totalSubmissions: s.submissions,
    }));

    // ─── Contests ─────────────────────────────────
    const contests = _normalizeContests(contestHistory);

    return _buildResponse({
      handle: trimmedHandle,
      rating,
      maxRating,
      contests,
      submissions,
      tags,
    });
  } catch (error) {
    logger.error(`LeetCode platform service error for ${trimmedHandle}`, {
      error: error.message,
    });

    return _buildResponse({
      handle: trimmedHandle,
      status: 'failed',
      error: error.message || 'Unknown LeetCode error',
    });
  }
}

module.exports = { fetchProfile, PLATFORM };
