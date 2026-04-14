const axios = require('axios');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Codeforces API Service.
 *
 * Wraps all interactions with the Codeforces public API.
 * Handles retries, rate limiting, error mapping, and data normalization.
 *
 * API Docs: https://codeforces.com/apiHelp
 */
class CodeforcesService {
  constructor() {
    this.client = axios.create({
      baseURL: config.codeforcesApiBase,
      timeout: 15000, // 15s timeout
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CodingContestAnalytics/1.0',
      },
    });

    // ─── Rate Limiting State ──────────────────────────
    // Codeforces allows ~5 requests per second; we enforce a safe margin
    this.requestQueue = [];
    this.minRequestInterval = 250; // ms between requests (4/sec max)
    this.lastRequestTime = 0;

    // ─── Retry Config ─────────────────────────────────
    this.maxRetries = 3;
    this.retryDelay = 1000; // Base delay in ms (exponential backoff)
  }

  // ─── Core Request Handler ───────────────────────────

  /**
   * Make a rate-limited, retry-capable request to the Codeforces API.
   *
   * @param {string} endpoint - API endpoint (e.g. '/user.rating')
   * @param {object} params - Query parameters
   * @param {number} [retryCount=0] - Current retry attempt
   * @returns {Promise<object>} API response data (result field)
   */
  async _request(endpoint, params = {}, retryCount = 0) {
    // ─── Rate Limiting ──────────────────────────────
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - elapsed;
      await this._sleep(waitTime);
    }
    this.lastRequestTime = Date.now();

    try {
      logger.debug(`Codeforces API: ${endpoint}`, { params });

      const response = await this.client.get(endpoint, { params });

      // Codeforces wraps all responses in { status, result, comment }
      if (response.data.status !== 'OK') {
        const comment = response.data.comment || 'Unknown API error';
        throw new Error(`Codeforces API error: ${comment}`);
      }

      return response.data.result;
    } catch (error) {
      return this._handleError(error, endpoint, params, retryCount);
    }
  }

  // ─── Error Handler with Retry Logic ─────────────────

  /**
   * Handle API errors with exponential backoff retry.
   */
  async _handleError(error, endpoint, params, retryCount) {
    const status = error.response?.status;
    const cfComment = error.response?.data?.comment;

    // ─── Non-retryable errors ───────────────────────
    if (status === 400) {
      // Bad request — invalid handle, etc.
      const message = cfComment || 'Invalid request to Codeforces API';
      logger.warn(`Codeforces 400: ${message}`, { endpoint, params });
      throw AppError.badRequest(message);
    }

    if (status === 404 || (cfComment && cfComment.includes('not found'))) {
      logger.warn(`Codeforces 404: Resource not found`, { endpoint, params });
      throw AppError.notFound('Codeforces resource not found. Check the handle/contest ID.');
    }

    // ─── Retryable errors (429, 5xx, network) ───────
    if (retryCount < this.maxRetries) {
      const isRetryable =
        status === 429 ||
        (status && status >= 500) ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        !error.response; // Network error

      if (isRetryable) {
        const delay = this.retryDelay * Math.pow(2, retryCount); // Exponential backoff
        logger.warn(
          `Codeforces API retry ${retryCount + 1}/${this.maxRetries} for ${endpoint} in ${delay}ms`,
          { status, error: error.message }
        );
        await this._sleep(delay);
        return this._request(endpoint, params, retryCount + 1);
      }
    }

    // ─── Exhausted retries or non-retryable ─────────
    logger.error('Codeforces API request failed', {
      endpoint,
      params,
      status,
      message: error.message,
      retryCount,
    });

    if (status === 429) {
      throw AppError.tooManyRequests('Codeforces API rate limit exceeded. Please try again later.');
    }

    throw AppError.serviceUnavailable(
      'Codeforces API is currently unavailable. Please try again later.'
    );
  }

  // ─── Public API Methods ─────────────────────────────

  /**
   * Fetch a user's rating change history.
   *
   * @param {string} handle - Codeforces handle
   * @returns {Promise<Array<object>>} Normalized rating history entries
   */
  async getUserRatingHistory(handle) {
    if (!handle || typeof handle !== 'string') {
      throw AppError.badRequest('A valid Codeforces handle is required');
    }

    const result = await this._request('/user.rating', { handle: handle.trim() });

    // Normalize the data
    return result.map((entry) => this._normalizeRatingEntry(entry));
  }

  /**
   * Fetch basic user info from Codeforces.
   *
   * @param {string} handle - Codeforces handle
   * @returns {Promise<object>} User info
   */
  async getUserInfo(handle) {
    if (!handle || typeof handle !== 'string') {
      throw AppError.badRequest('A valid Codeforces handle is required');
    }

    const result = await this._request('/user.info', { handles: handle.trim() });

    if (!result || result.length === 0) {
      throw AppError.notFound(`Codeforces user "${handle}" not found`);
    }

    return this._normalizeUserInfo(result[0]);
  }

  /**
   * Fetch the list of all Codeforces contests.
   *
   * @param {boolean} [gym=false] - If true, fetch gym contests instead
   * @returns {Promise<Array<object>>} Normalized contest list
   */
  async getContestList(gym = false) {
    const result = await this._request('/contest.list', { gym });

    // Normalize and return only finished contests
    return result
      .filter((contest) => contest.phase === 'FINISHED')
      .map((contest) => this._normalizeContest(contest));
  }

  /**
   * Fetch standings/results for a specific contest.
   *
   * @param {number} contestId - Codeforces contest ID
   * @param {string} [handle] - Optional: filter to a specific user
   * @returns {Promise<object>} Contest standings data
   */
  async getContestStandings(contestId, handle) {
    const params = { contestId, from: 1, count: 5 };
    if (handle) {
      params.handles = handle;
      params.showUnofficial = true;
    }

    const result = await this._request('/contest.standings', params);

    return {
      contest: this._normalizeContest(result.contest),
      rows: result.rows.map((row) => ({
        rank: row.rank,
        handle: row.party?.members?.[0]?.handle || 'unknown',
        points: row.points,
        penalty: row.penalty,
        successfulHackCount: row.successfulHackCount,
        unsuccessfulHackCount: row.unsuccessfulHackCount,
      })),
    };
  }

  /**
   * Fetch user submissions (for problem-solving stats).
   *
   * @param {string} handle - Codeforces handle
   * @param {number} [count=100] - Number of submissions to fetch
   * @returns {Promise<Array<object>>} Normalized submissions
   */
  async getUserSubmissions(handle, count = 100) {
    if (!handle || typeof handle !== 'string') {
      throw AppError.badRequest('A valid Codeforces handle is required');
    }

    const result = await this._request('/user.status', {
      handle: handle.trim(),
      from: 1,
      count,
    });

    return result.map((sub) => ({
      submissionId: sub.id,
      contestId: sub.contestId,
      problem: {
        contestId: sub.problem?.contestId,
        index: sub.problem?.index,
        name: sub.problem?.name,
        rating: sub.problem?.rating || null,
        tags: sub.problem?.tags || [],
      },
      verdict: sub.verdict,
      language: sub.programmingLanguage,
      timestamp: new Date(sub.creationTimeSeconds * 1000).toISOString(),
    }));
  }

  // ─── Data Normalization ─────────────────────────────

  /**
   * Normalize a rating history entry from the Codeforces API.
   */
  _normalizeRatingEntry(entry) {
    return {
      contestId: entry.contestId,
      contestName: entry.contestName,
      rank: entry.rank,
      oldRating: entry.oldRating,
      newRating: entry.newRating,
      ratingChange: entry.newRating - entry.oldRating,
      timestamp: new Date(entry.ratingUpdateTimeSeconds * 1000).toISOString(),
    };
  }

  /**
   * Normalize a contest from the Codeforces API.
   */
  _normalizeContest(contest) {
    return {
      platform: 'codeforces',
      contestId: contest.id,
      name: contest.name,
      type: contest.type, // CF, IOI, ICPC
      phase: contest.phase,
      startTime: contest.startTimeSeconds
        ? new Date(contest.startTimeSeconds * 1000).toISOString()
        : null,
      duration: contest.durationSeconds,
      durationFormatted: this._formatDuration(contest.durationSeconds),
    };
  }

  /**
   * Normalize user info from the Codeforces API.
   */
  _normalizeUserInfo(user) {
    return {
      handle: user.handle,
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      rank: user.rank || 'unrated',
      maxRank: user.maxRank || 'unrated',
      contribution: user.contribution || 0,
      registrationTime: user.registrationTimeSeconds
        ? new Date(user.registrationTimeSeconds * 1000).toISOString()
        : null,
      avatar: user.titlePhoto || user.avatar || null,
    };
  }

  // ─── Utility Methods ───────────────────────────────

  /**
   * Format seconds into a human-readable duration string.
   */
  _formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }

  /**
   * Sleep utility for rate limiting & retry backoff.
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new CodeforcesService();
