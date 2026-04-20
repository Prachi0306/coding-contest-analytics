const { platformServices, getAllPlatforms } = require('./platforms');
const logger = require('../utils/logger');

/**
 * Platform Aggregator Service.
 *
 * Orchestrates fetching data from ALL configured platforms in parallel
 * using Promise.allSettled — the system NEVER crashes due to a single
 * platform failure.
 *
 * Responsibilities:
 *   • Call all platform services concurrently
 *   • Separate results into successPlatforms / failedPlatforms
 *   • Normalize the final response
 *   • Log failures for debugging without blocking the user
 */
class PlatformAggregatorService {
  /**
   * Fetch profile data from all platforms the user has connected.
   *
   * @param {object} platformHandles - { codeforces: 'handle', leetcode: 'handle', codechef: 'handle' }
   * @returns {Promise<object>} { platforms: [...], failedPlatforms: [...] }
   */
  async fetchAllProfiles(platformHandles = {}) {
    // ─── Determine which platforms to query ──────────
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

    // ─── Parallel fetch — NEVER fails entirely ──────
    const results = await Promise.allSettled(
      activePlatforms.map(({ platform, handle, service }) =>
        service.fetchProfile(handle)
      )
    );

    // ─── Categorize results ─────────────────────────
    const platforms = [];
    const failedPlatforms = [];

    results.forEach((result, index) => {
      const { platform, handle } = activePlatforms[index];

      if (result.status === 'fulfilled') {
        const data = result.value;

        if (data.status === 'success') {
          platforms.push(data);
        } else {
          // Service returned a failure response (did not throw)
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
        // Promise itself rejected (should never happen — services catch all errors)
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

  /**
   * Fetch profile data for a SINGLE platform.
   * Useful when the caller only needs one platform.
   *
   * @param {string} platform - Platform identifier (e.g. 'leetcode')
   * @param {string} handle - Platform username
   * @returns {Promise<object>} Standard platform response
   */
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
      // Safety net — should never reach here
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

  // ─── Private Helpers ────────────────────────────────

  /**
   * Filter platformHandles to only those with a non-empty value
   * and a corresponding registered service.
   *
   * @param {object} platformHandles
   * @returns {Array<{platform: string, handle: string, service: object}>}
   */
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
