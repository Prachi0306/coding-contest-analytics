const axios = require('axios');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');


class CodeforcesService {
  constructor() {
    this.client = axios.create({
      baseURL: config.codeforcesApiBase,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CodingContestAnalytics/1.0',
      },
    });


    this.requestQueue = [];
    this.minRequestInterval = 250;
    this.lastRequestTime = 0;

    this.maxRetries = 3;
    this.retryDelay = 1000;
  }



  async _request(endpoint, params = {}, retryCount = 0) {
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

      if (response.data.status !== 'OK') {
        const comment = response.data.comment || 'Unknown API error';
        throw new Error(`Codeforces API error: ${comment}`);
      }

      return response.data.result;
    } catch (error) {
      return this._handleError(error, endpoint, params, retryCount);
    }
  }



  async _handleError(error, endpoint, params, retryCount) {
    const status = error.response?.status;
    const cfComment = error.response?.data?.comment;

    if (status === 400) {
      const message = cfComment || 'Invalid request to Codeforces API';
      logger.warn(`Codeforces 400: ${message}`, { endpoint, params });
      throw AppError.badRequest(message);
    }

    if (status === 404 || (cfComment && cfComment.includes('not found'))) {
      logger.warn(`Codeforces 404: Resource not found`, { endpoint, params });
      throw AppError.notFound('Codeforces resource not found. Check the handle/contest ID.');
    }

    if (retryCount < this.maxRetries) {
      const isRetryable =
        status === 429 ||
        (status && status >= 500) ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        !error.response;

      if (isRetryable) {
        const delay = this.retryDelay * Math.pow(2, retryCount);
        logger.warn(
          `Codeforces API retry ${retryCount + 1}/${this.maxRetries} for ${endpoint} in ${delay}ms`,
          { status, error: error.message }
        );
        await this._sleep(delay);
        return this._request(endpoint, params, retryCount + 1);
      }
    }

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



  async getUserRatingHistory(handle) {
    if (!handle || typeof handle !== 'string') {
      throw AppError.badRequest('A valid Codeforces handle is required');
    }

    const result = await this._request('/user.rating', { handle: handle.trim() });

    return result.map((entry) => this._normalizeRatingEntry(entry));
  }


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


  async getContestList(gym = false) {
    const result = await this._request('/contest.list', { gym });

    return result
      .filter((contest) => ['FINISHED', 'BEFORE', 'CODING'].includes(contest.phase))
      .map((contest) => this._normalizeContest(contest));
  }


  async getContestDetailsAndProblems(contestId) {
    const contests = await this.getContestList();
    const contest = contests.find(c => String(c.contestId) === String(contestId));

    if (!contest) {
      throw AppError.notFound(`Contest ${contestId} not found in Codeforces list`);
    }

    const result = await this._request('/problemset.problems');
    const problems = result.problems.filter(p => String(p.contestId) === String(contestId));

    if (!problems || problems.length === 0) {
      throw AppError.badRequest('No problems found for this contest');
    }

    return {
      contest,
      problems: problems.map(p => ({
        contestId: p.contestId || contestId,
        index: p.index,
        name: p.name,
        rating: p.rating || null,
        tags: p.tags || [],
      }))
    };
  }


  async getUserContestSubmissions(contestId, handle) {
    if (!handle || typeof handle !== 'string') {
      throw AppError.badRequest('A valid Codeforces handle is required');
    }

    const result = await this._request('/contest.status', {
      contestId,
      handle: handle.trim(),
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
      participantType: sub.author?.participantType || 'PRACTICE',
      timestamp: new Date(sub.creationTimeSeconds * 1000).toISOString(),
    }));
  }

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
      participantType: sub.author?.participantType || 'PRACTICE',
      timestamp: new Date(sub.creationTimeSeconds * 1000).toISOString(),
    }));
  }



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


  _normalizeContest(contest) {
    return {
      platform: 'codeforces',
      contestId: contest.id,
      name: contest.name,
      type: contest.type,
      phase: contest.phase,
      startTime: contest.startTimeSeconds
        ? new Date(contest.startTimeSeconds * 1000).toISOString()
        : null,
      duration: contest.durationSeconds,
      durationFormatted: this._formatDuration(contest.durationSeconds),
    };
  }


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



  _formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  }


  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new CodeforcesService();
