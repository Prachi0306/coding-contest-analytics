const codeforcesService = require('../codeforces.service');
const logger = require('../../utils/logger');



const PLATFORM = 'codeforces';


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


function _aggregateTags(submissions) {
  const tagMap = {};
  for (const sub of submissions) {
    if (sub.verdict !== 'OK') continue;
    const tags = sub.problem?.tags || [];
    for (const tag of tags) {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }
  }
  return tagMap;
}


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
    const [userInfo, ratingHistory, submissions] = await Promise.allSettled([
      codeforcesService.getUserInfo(trimmedHandle),
      codeforcesService.getUserRatingHistory(trimmedHandle),
      codeforcesService.getUserSubmissions(trimmedHandle, 500),
    ]);

    const info = userInfo.status === 'fulfilled' ? userInfo.value : null;
    const ratings = ratingHistory.status === 'fulfilled' ? ratingHistory.value : [];
    const subs = submissions.status === 'fulfilled' ? submissions.value : [];

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
