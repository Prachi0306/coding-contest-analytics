const Bookmark = require('../models/Bookmark');
const Contest = require('../models/Contest');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

class BookmarkService {

  async addBookmark(userId, contestId) {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw AppError.notFound('Contest not found');
    }

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


  async removeBookmark(userId, contestId) {
    const result = await Bookmark.findOneAndDelete({ userId, contestId });

    if (!result) {
      throw AppError.notFound('Bookmark not found or you do not have permission to remove it');
    }

    logger.info(`User ${userId} removed bookmark for contest ${contestId}`);
  }


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
      ...item.contest,
    }));
  }
}

module.exports = new BookmarkService();
