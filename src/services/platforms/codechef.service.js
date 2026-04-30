const axios = require('axios');
const logger = require('../../utils/logger');



const PLATFORM = 'codechef';
const CODECHEF_API_BASE = 'https://codechef-api.vercel.app/handle';
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;


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
        !error.response ||
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

    if (error.response?.status === 402 || error.response?.status === 429) {
      throw new Error('CodeChef public API quota exceeded (Rate Limited). Please try syncing again in a few minutes.');
    }

    throw error;
  }
}


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


function _parseSubmissions(data) {
  try {
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

    const ratingMatch = rawHtml.match(/class=["']rating-number["'][^>]*>(\d+)/i) || rawHtml.match(/class=["']rating["'][^>]*>(\d{3,})/i);
    if (ratingMatch) currentRating = parseInt(ratingMatch[1], 10);
    
    const maxRatingMatch = rawHtml.match(/Highest Rating\s*(\d+)/i);
    if (maxRatingMatch) highestRating = parseInt(maxRatingMatch[1], 10);

    if (currentRating === null && highestRating === null) {
         throw new Error(`CodeChef user "${trimmedHandle}" not found or layout changed`);
    }

    const tags = {};
    const submissions = [];
    let contests = [];
    
    const solvedMatch = rawHtml.match(/Fully Solved\s*\(\s*(\d+)/i);
    if (solvedMatch) {
       submissions.push({ difficulty: 'fullySolved', count: parseInt(solvedMatch[1], 10) });
    }

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
