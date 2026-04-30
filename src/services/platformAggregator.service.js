const { platformServices, getAllPlatforms } = require('./platforms');
const logger = require('../utils/logger');


class PlatformAggregatorService {

  async fetchAllProfiles(platformHandles = {}) {
    const activePlatforms = this._getActivePlatforms(platformHandles);

    if (activePlatforms.length === 0) {
      logger.info('Aggregator: no platform handles configured');
      return {
        platforms: [],
        failedPlatforms: [],
        summary: {
          total: 0,
          success: 0,
          failed: 0,
        },
      };
    }

    logger.info(`Aggregator: fetching profiles for ${activePlatforms.length} platform(s)`, {
      platforms: activePlatforms.map((p) => p.platform),
    });

    const results = await Promise.allSettled(
      activePlatforms.map(({ platform, handle, service }) =>
        service.fetchProfile(handle)
      )
    );

    const platforms = [];
    const failedPlatforms = [];

    results.forEach((result, index) => {
      const { platform, handle } = activePlatforms[index];

      if (result.status === 'fulfilled') {
        const data = result.value;

        if (data.status === 'success') {
          platforms.push(data);
        } else {
          failedPlatforms.push({
            platform,
            handle,
            error: data.error || 'Unknown error',
          });
          logger.warn(`Aggregator: ${platform} returned failed status`, {
            handle,
            error: data.error,
          });
        }
      } else {
        failedPlatforms.push({
          platform,
          handle,
          error: result.reason?.message || 'Unexpected service failure',
        });
        logger.error(`Aggregator: ${platform} promise rejected (unexpected)`, {
          handle,
          error: result.reason?.message,
        });
      }
    });

    const summary = {
      total: activePlatforms.length,
      success: platforms.length,
      failed: failedPlatforms.length,
    };

    logger.info('Aggregator: fetch complete', summary);

    return { platforms, failedPlatforms, summary };
  }


  async fetchSingleProfile(platform, handle) {
    const service = platformServices[platform];

    if (!service) {
      logger.warn(`Aggregator: unknown platform "${platform}"`);
      return {
        platform,
        status: 'failed',
        handle: handle || '',
        rating: null,
        maxRating: null,
        contests: [],
        submissions: [],
        tags: {},
        error: `Unknown platform: ${platform}`,
      };
    }

    if (!handle || !handle.trim()) {
      return {
        platform,
        status: 'failed',
        handle: '',
        rating: null,
        maxRating: null,
        contests: [],
        submissions: [],
        tags: {},
        error: `No handle provided for ${platform}`,
      };
    }

    try {
      return await service.fetchProfile(handle.trim());
    } catch (error) {
      logger.error(`Aggregator: unexpected error for ${platform}`, {
        handle,
        error: error.message,
      });
      return {
        platform,
        status: 'failed',
        handle,
        rating: null,
        maxRating: null,
        contests: [],
        submissions: [],
        tags: {},
        error: error.message || 'Unexpected error',
      };
    }
  }



  _getActivePlatforms(platformHandles) {
    const registered = getAllPlatforms();
    const active = [];

    for (const platform of registered) {
      const handle = platformHandles[platform];
      if (handle && typeof handle === 'string' && handle.trim()) {
        const service = platformServices[platform];
        if (service) {
          active.push({ platform, handle: handle.trim(), service });
        }
      }
    }

    return active;
  }
}

module.exports = new PlatformAggregatorService();
