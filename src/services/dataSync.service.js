const Contest = require('../models/Contest');
const UserStats = require('../models/UserStats');
const codeforcesService = require('./codeforces.service');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');


class DataSyncService {


  async syncCodeforcesContests() {
    logger.info('Starting Codeforces contest sync...');

    try {
      const contests = await codeforcesService.getContestList(false);

      if (!contests || contests.length === 0) {
        logger.warn('No contests returned from Codeforces API');
        return { synced: 0, total: 0, result: null };
      }

      const contestDocs = contests.map((c) => ({
        platform: 'codeforces',
        contestId: c.contestId,
        name: c.name,
        type: this._mapContestType(c.type),
        phase: c.phase || 'FINISHED',
        startTime: c.startTime ? new Date(c.startTime) : new Date(),
        duration: c.duration || 0,
      }));

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


  async syncLeetCodeContests() {
    logger.info('Starting LeetCode contest sync...');
    try {
      const axios = require('axios');
      const query = `
        query {
          topTwoContests { title titleSlug startTime duration }
          pastContests(pageNo: 1, numPerPage: 50) {
            data { title titleSlug startTime duration }
          }
        }
      `;
      const res = await axios.post('https://leetcode.com/graphql', { query }, { timeout: 10000 });
      const topTwo = res.data?.data?.topTwoContests || [];
      const past = res.data?.data?.pastContests?.data || [];
      
      const allContests = [...topTwo, ...past];
      if (allContests.length === 0) return { synced: 0, total: 0 };

      const contestDocs = allContests.map((c) => {
        const startTime = new Date(c.startTime * 1000);
        const now = new Date();
        const endTime = new Date(startTime.getTime() + c.duration * 1000);
        
        let phase = 'FINISHED';
        if (now < startTime) phase = 'BEFORE';
        else if (now >= startTime && now <= endTime) phase = 'CODING';

        return {
          platform: 'leetcode',
          contestId: c.titleSlug,
          name: c.title,
          type: 'OTHER',
          phase,
          startTime,
          duration: c.duration,
        };
      });

      const result = await Contest.bulkUpsertContests(contestDocs);
      return { synced: (result.upsertedCount || 0) + (result.modifiedCount || 0), total: contestDocs.length };
    } catch (error) {
      logger.error('LeetCode contest sync failed', { error: error.message });
      throw error;
    }
  }


  async syncCodeChefContests() {
    logger.info('Starting CodeChef contest sync...');
    try {
      const axios = require('axios');
      const res = await axios.get('https://www.codechef.com/api/list/contests/all', { timeout: 10000 });
      
      const future = res.data?.future_contests || [];
      const present = res.data?.present_contests || [];
      const past = res.data?.past_contests || [];

      const mapCcContest = (c, phase) => {
        return {
          platform: 'codechef',
          contestId: c.contest_code,
          name: c.contest_name,
          type: 'OTHER',
          phase,
          startTime: new Date(c.contest_start_date_iso),
          duration: parseInt(c.contest_duration, 10) * 60,
        };
      };

      const contestDocs = [
        ...future.map(c => mapCcContest(c, 'BEFORE')),
        ...present.map(c => mapCcContest(c, 'CODING')),
        ...past.map(c => mapCcContest(c, 'FINISHED')),
      ];

      if (contestDocs.length === 0) return { synced: 0, total: 0 };

      const result = await Contest.bulkUpsertContests(contestDocs);
      return { synced: (result.upsertedCount || 0) + (result.modifiedCount || 0), total: contestDocs.length };
    } catch (error) {
      logger.error('CodeChef contest sync failed', { error: error.message });
      throw error;
    }
  }



  async syncUserRatingHistory(userId, codeforcesHandle) {
    if (!userId) {
      throw AppError.badRequest('User ID is required for rating sync');
    }
    if (!codeforcesHandle) {
      throw AppError.badRequest('Codeforces handle is required for rating sync');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    logger.info(`Starting rating sync for user ${userId} (handle: ${codeforcesHandle})`);

    try {
      const ratingHistory = await codeforcesService.getUserRatingHistory(codeforcesHandle);

      if (!ratingHistory || ratingHistory.length === 0) {
        logger.info(`No rating history found for handle: ${codeforcesHandle}`);
        return { synced: 0, total: 0 };
      }

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



  async syncUserData(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const handle = user.platformHandles?.codeforces || user.handles?.codeforces;
    if (!handle) {
      throw AppError.badRequest(
        'Please wait for full multi-platform background sync (next feature rollout), or add a Codeforces handle.'
      );
    }

    logger.info(`Starting full data sync for user ${user.username} (${handle})`);

    const results = {
      contests: null,
      ratings: null,
      errors: [],
    };

    try {
      results.ratings = await this.syncUserRatingHistory(userId, handle);
    } catch (error) {
      logger.error('Rating sync failed during full sync', { error: error.message });
      results.errors.push({ type: 'ratings', message: error.message });
    }



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
        logger.warn(`Sync failed for ${user.username}: ${error.message}`);
      }

      await this._sleep(500);
    }

    logger.info('Batch sync complete', {
      total: results.totalUsers,
      synced: results.synced,
      failed: results.failed,
    });

    return results;
  }



  _mapContestType(cfType) {
    const typeMap = { CF: 'CF', IOI: 'IOI', ICPC: 'ICPC' };
    return typeMap[cfType] || 'OTHER';
  }


  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new DataSyncService();
