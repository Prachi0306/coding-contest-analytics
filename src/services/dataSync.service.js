const Contest = require('../models/Contest');
const UserStats = require('../models/UserStats');
const codeforcesService = require('./codeforces.service');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * Data Sync Service.
 *
 * Orchestrates fetching data from external APIs (Codeforces)
 * and persisting it to Contest + UserStats models.
 *
 * All writes are idempotent — safe to run multiple times
 * without creating duplicates (enforced by compound unique indexes
 * + upsert operations).
 */
class DataSyncService {
  // ─── Contest Sync ───────────────────────────────────

  /**
   * Sync all Codeforces contests into the Contest collection.
   * Uses bulkUpsertContests — idempotent and deduplicated.
   *
   * @returns {Promise<object>} { synced, total, result }
   */
  async syncCodeforcesContests() {
    logger.info('Starting Codeforces contest sync...');

    try {
      // 1. Fetch all finished contests from Codeforces API
      const contests = await codeforcesService.getContestList(false);

      if (!contests || contests.length === 0) {
        logger.warn('No contests returned from Codeforces API');
        return { synced: 0, total: 0, result: null };
      }

      // 2. Normalize data for the Contest model
      const contestDocs = contests.map((c) => ({
        platform: 'codeforces',
        contestId: c.contestId,
        name: c.name,
        type: this._mapContestType(c.type),
        phase: c.phase || 'FINISHED',
        startTime: c.startTime ? new Date(c.startTime) : new Date(),
        duration: c.duration || 0,
      }));

      // 3. Bulk upsert — duplicates are handled by the unique index
      const result = await Contest.bulkUpsertContests(contestDocs);

      const upserted = result.upsertedCount || 0;
      const modified = result.modifiedCount || 0;

      logger.info(`Codeforces contest sync complete`, {
        total: contestDocs.length,
        newContests: upserted,
        updatedContests: modified,
      });

      return {
        synced: upserted + modified,
        total: contestDocs.length,
        newContests: upserted,
        updatedContests: modified,
      };
    } catch (error) {
      logger.error('Codeforces contest sync failed', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ─── User Rating History Sync ──────────────────────

  /**
   * Sync a user's Codeforces rating history into UserStats.
   * Fetches from the Codeforces API and bulk upserts — fully idempotent.
   *
   * @param {string} userId - MongoDB User ID
   * @param {string} codeforcesHandle - Codeforces username
   * @returns {Promise<object>} { synced, total, result }
   * @throws {AppError} 400 if handle is missing, 404 if user not found
   */
  async syncUserRatingHistory(userId, codeforcesHandle) {
    // ─── Validate inputs ──────────────────────────────
    if (!userId) {
      throw AppError.badRequest('User ID is required for rating sync');
    }
    if (!codeforcesHandle) {
      throw AppError.badRequest('Codeforces handle is required for rating sync');
    }

    // ─── Verify user exists ───────────────────────────
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    logger.info(`Starting rating sync for user ${userId} (handle: ${codeforcesHandle})`);

    try {
      // 1. Fetch rating history from Codeforces
      const ratingHistory = await codeforcesService.getUserRatingHistory(codeforcesHandle);

      if (!ratingHistory || ratingHistory.length === 0) {
        logger.info(`No rating history found for handle: ${codeforcesHandle}`);
        return { synced: 0, total: 0 };
      }

      // 2. Transform into UserStats documents
      const statsDocs = ratingHistory.map((entry) => ({
        userId,
        platform: 'codeforces',
        contestId: entry.contestId,
        contestName: entry.contestName || '',
        rank: entry.rank,
        oldRating: entry.oldRating,
        newRating: entry.newRating,
        ratingChange: entry.ratingChange,
        timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
      }));

      // 3. Validate — filter out entries with missing required fields
      const validStats = statsDocs.filter((stat) => {
        if (!stat.contestId || stat.rank === undefined || stat.rank === null) {
          logger.warn('Skipping invalid stats entry', { stat });
          return false;
        }
        return true;
      });

      if (validStats.length === 0) {
        logger.warn('No valid stats entries after filtering');
        return { synced: 0, total: ratingHistory.length, skipped: ratingHistory.length };
      }

      // 4. Bulk upsert — duplicates handled by unique index
      const result = await UserStats.bulkUpsertStats(validStats);

      const upserted = result.upsertedCount || 0;
      const modified = result.modifiedCount || 0;

      logger.info(`Rating sync complete for ${codeforcesHandle}`, {
        total: validStats.length,
        newEntries: upserted,
        updatedEntries: modified,
        skipped: ratingHistory.length - validStats.length,
      });

      return {
        synced: upserted + modified,
        total: validStats.length,
        newEntries: upserted,
        updatedEntries: modified,
        skipped: ratingHistory.length - validStats.length,
      };
    } catch (error) {
      logger.error(`Rating sync failed for ${codeforcesHandle}`, {
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // ─── Full User Sync ────────────────────────────────

  /**
   * Full sync for a user: contests + rating history.
   * Orchestrates both sync operations and returns combined results.
   *
   * @param {string} userId - MongoDB User ID
   * @returns {Promise<object>} { contests, ratings }
   */
  async syncUserData(userId) {
    // ─── Lookup user and their handle ─────────────────
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const handle = user.handles?.codeforces;
    if (!handle) {
      throw AppError.badRequest(
        'No Codeforces handle configured. Please update your profile with a Codeforces handle.'
      );
    }

    logger.info(`Starting full data sync for user ${user.username} (${handle})`);

    const results = {
      contests: null,
      ratings: null,
      errors: [],
    };

    // ─── Sync contests (shared across all users) ──────
    try {
      results.contests = await this.syncCodeforcesContests();
    } catch (error) {
      logger.error('Contest sync failed during full sync', { error: error.message });
      results.errors.push({ type: 'contests', message: error.message });
    }

    // ─── Sync user's rating history ───────────────────
    try {
      results.ratings = await this.syncUserRatingHistory(userId, handle);
    } catch (error) {
      logger.error('Rating sync failed during full sync', { error: error.message });
      results.errors.push({ type: 'ratings', message: error.message });
    }

    // ─── If both failed, throw ────────────────────────
    if (results.errors.length === 2) {
      throw AppError.serviceUnavailable(
        'Data sync failed completely. Please try again later.'
      );
    }

    logger.info(`Full data sync complete for ${user.username}`, {
      contests: results.contests,
      ratings: results.ratings,
      errors: results.errors.length,
    });

    return results;
  }

  // ─── Batch Sync (All Users) ────────────────────────

  /**
   * Sync rating history for all users that have a Codeforces handle.
   * Used by background jobs (Step 12).
   *
   * @returns {Promise<object>} { totalUsers, synced, failed, results }
   */
  async syncAllUsers() {
    const User = require('../models/User');

    const users = await User.find({
      'handles.codeforces': { $exists: true, $ne: '' },
      isActive: true,
    }).select('_id username handles.codeforces');

    logger.info(`Starting batch sync for ${users.length} users`);

    const results = {
      totalUsers: users.length,
      synced: 0,
      failed: 0,
      details: [],
    };

    for (const user of users) {
      try {
        const syncResult = await this.syncUserRatingHistory(
          user._id.toString(),
          user.handles.codeforces
        );
        results.synced++;
        results.details.push({
          userId: user._id,
          username: user.username,
          status: 'success',
          ...syncResult,
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          userId: user._id,
          username: user.username,
          status: 'failed',
          error: error.message,
        });
        // Don't throw — continue with next user
        logger.warn(`Sync failed for ${user.username}: ${error.message}`);
      }

      // ─── Rate limit between users ───────────────────
      await this._sleep(500);
    }

    logger.info('Batch sync complete', {
      total: results.totalUsers,
      synced: results.synced,
      failed: results.failed,
    });

    return results;
  }

  // ─── Helpers ───────────────────────────────────────

  /**
   * Map Codeforces contest type string to our enum.
   */
  _mapContestType(cfType) {
    const typeMap = { CF: 'CF', IOI: 'IOI', ICPC: 'ICPC' };
    return typeMap[cfType] || 'OTHER';
  }

  /**
   * Sleep utility for rate limiting.
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new DataSyncService();
