const Bookmark = require('../models/Bookmark');
const Contest = require('../models/Contest');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class BookmarkService {
  /**
   * Add a contest to the user's schedule.
   * Idempotent: safe to call multiple times.
   *
   * @param {string} userId - MongoDB ObjectId of the user
   * @param {string} contestId - MongoDB ObjectId of the contest
   * @returns {Promise<object>} The created/updated bookmark
   */
  async addBookmark(userId, contestId) {
    // 1. Verify contest exists
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw AppError.notFound('Contest not found');
    }

    // 2. Upsert bookmark (idempotent operation)
    const bookmark = await Bookmark.findOneAndUpdate(
      { userId, contestId },
      {
        $set: {
          userId,
          contestId,
          platform: contest.platform,
          isStarred: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    logger.info(`User ${userId} bookmarked contest ${contestId}`);
    return bookmark;
  }

  /**
   * Remove a contest from the user's schedule.
   * Validates ownership implicitly by matching userId and contestId.
   *
   * @param {string} userId - MongoDB ObjectId of the user
   * @param {string} contestId - MongoDB ObjectId of the contest
   * @returns {Promise<void>}
   */
  async removeBookmark(userId, contestId) {
    const result = await Bookmark.findOneAndDelete({ userId, contestId });

    if (!result) {
      throw AppError.notFound('Bookmark not found or you do not have permission to remove it');
    }

    logger.info(`User ${userId} removed bookmark for contest ${contestId}`);
  }

  /**
   * Get the user's schedule (all bookmarked contests),
   * sorted by upcoming contests first (startTime).
   *
   * @param {string} userId - MongoDB ObjectId of the user
   * @returns {Promise<Array>} Array of populated contest objects
   */
  async getUserSchedule(userId) {
    const objectIdUser = new mongoose.Types.ObjectId(userId);

    const schedule = await Bookmark.aggregate([
      { $match: { userId: objectIdUser, isStarred: true } },
      {
        $lookup: {
          from: 'contests',
          localField: 'contestId',
          foreignField: '_id',
          as: 'contest',
        },
      },
      { $unwind: '$contest' },
      { $sort: { 'contest.startTime': 1 } },
      {
        $project: {
          _id: 1,
          platform: 1,
          contest: 1,
          createdAt: 1,
        },
      },
    ]);

    return schedule.map((item) => ({
      bookmarkId: item._id,
      bookmarkedAt: item.createdAt,
      ...item.contest, // Spread contest fields directly for frontend convenience
    }));
  }
}

module.exports = new BookmarkService();
