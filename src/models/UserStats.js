const mongoose = require('mongoose');


const PLATFORMS = ['codeforces', 'leetcode', 'codechef'];


const userStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: {
        values: PLATFORMS,
        message: 'Platform must be one of: {VALUE}',
      },
      lowercase: true,
      trim: true,
    },

    contestId: {
      type: String,
      required: [true, 'Contest ID is required'],
    },

    contestName: {
      type: String,
      trim: true,
      maxlength: [300, 'Contest name must not exceed 300 characters'],
      default: '',
    },

    rank: {
      type: Number,
      required: [true, 'Rank is required'],
      min: [0, 'Rank cannot be negative'],
    },

    oldRating: {
      type: Number,
      default: 0,
    },

    newRating: {
      type: Number,
      default: 0,
    },

    ratingChange: {
      type: Number,
      default: 0,
    },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);


userStatsSchema.index({ userId: 1, platform: 1, contestId: 1 }, { unique: true });

userStatsSchema.index({ userId: 1, platform: 1, timestamp: -1 });

userStatsSchema.index({ platform: 1, userId: 1, timestamp: -1 });



userStatsSchema.statics.upsertStats = function (statsData) {
  const { userId, platform, contestId, ...updateFields } = statsData;

  const stringId = String(contestId);

  return this.findOneAndUpdate(
    { userId, platform: platform.toLowerCase(), contestId: stringId },
    { $set: { userId, platform: platform.toLowerCase(), contestId: stringId, ...updateFields } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};


userStatsSchema.statics.bulkUpsertStats = function (statsArray) {
  if (!statsArray || statsArray.length === 0) {
    return Promise.resolve({ modifiedCount: 0, upsertedCount: 0 });
  }

  const operations = statsArray.map((stat) => ({
    updateOne: {
      filter: {
        userId: stat.userId,
        platform: stat.platform.toLowerCase(),
        contestId: String(stat.contestId),
      },
      update: {
        $set: {
          ...stat,
          contestId: String(stat.contestId),
          platform: stat.platform.toLowerCase(),
        },
      },
      upsert: true,
    },
  }));

  return this.bulkWrite(operations, { ordered: false });
};


userStatsSchema.statics.getRatingHistory = function (userId, platform) {
  return this.find({ userId, platform: platform.toLowerCase() })
    .sort({ timestamp: 1 })
    .lean();
};


userStatsSchema.statics.getLatestRating = function (userId, platform) {
  return this.findOne({ userId, platform: platform.toLowerCase() })
    .sort({ timestamp: -1 })
    .lean();
};


userStatsSchema.statics.getContestHistory = function (userId, options = {}) {
  const { limit = 50, skip = 0, platform } = options;

  const query = { userId };
  if (platform) query.platform = platform.toLowerCase();

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};


userStatsSchema.statics.getStatsSummary = function (userId, platform) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), platform: platform.toLowerCase() } },
    {
      $group: {
        _id: null,
        totalContests: { $sum: 1 },
        currentRating: { $last: '$newRating' },
        maxRating: { $max: '$newRating' },
        bestRank: { $min: '$rank' },
        avgRank: { $avg: '$rank' },
        totalPositiveChanges: {
          $sum: { $cond: [{ $gt: ['$ratingChange', 0] }, 1, 0] },
        },
        totalNegativeChanges: {
          $sum: { $cond: [{ $lt: ['$ratingChange', 0] }, 1, 0] },
        },
        maxRatingChange: { $max: '$ratingChange' },
        minRatingChange: { $min: '$ratingChange' },
      },
    },
    {
      $project: {
        _id: 0,
        totalContests: 1,
        currentRating: 1,
        maxRating: 1,
        bestRank: 1,
        avgRank: { $round: ['$avgRank', 0] },
        totalPositiveChanges: 1,
        totalNegativeChanges: 1,
        maxRatingChange: 1,
        minRatingChange: 1,
      },
    },
  ]).then((results) => results[0] || null);
};


userStatsSchema.statics.getLeaderboard = function (platform, limit = 20) {
  return this.aggregate([
    { $match: { platform: platform.toLowerCase() } },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$userId',
        latestRating: { $first: '$newRating' },
        latestContest: { $first: '$contestName' },
        totalContests: { $sum: 1 },
        maxRating: { $max: '$newRating' },
      },
    },
    { $sort: { latestRating: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { username: 1, handles: 1, platformHandles: 1 } }],
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$user.username',
        handle: { $ifNull: [`$user.platformHandles.${platform.toLowerCase()}`, `$user.handles.${platform.toLowerCase()}`] },
        latestRating: 1,
        maxRating: 1,
        totalContests: 1,
        latestContest: 1,
      },
    },
  ]);
};


const UserStats = mongoose.model('UserStats', userStatsSchema);

module.exports = UserStats;
