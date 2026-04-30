const mongoose = require('mongoose');


const PLATFORMS = ['codeforces', 'leetcode', 'codechef'];
const CONTEST_PHASES = ['BEFORE', 'CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST', 'FINISHED'];
const CONTEST_TYPES = ['CF', 'IOI', 'ICPC', 'OTHER'];


const contestSchema = new mongoose.Schema(
  {
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

    name: {
      type: String,
      required: [true, 'Contest name is required'],
      trim: true,
      maxlength: [300, 'Contest name must not exceed 300 characters'],
    },

    type: {
      type: String,
      enum: {
        values: CONTEST_TYPES,
        message: 'Contest type must be one of: {VALUE}',
      },
      default: 'OTHER',
    },

    phase: {
      type: String,
      enum: {
        values: CONTEST_PHASES,
        message: 'Contest phase must be one of: {VALUE}',
      },
      default: 'FINISHED',
    },

    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true,
    },

    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [0, 'Duration cannot be negative'],
    },

    durationFormatted: {
      type: String,
      default: '',
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


contestSchema.index({ platform: 1, contestId: 1 }, { unique: true });

contestSchema.index({ platform: 1, startTime: -1 });

contestSchema.index({ name: 'text' });



contestSchema.pre('save', function (next) {
  if (this.isModified('duration')) {
    this.durationFormatted = Contest.formatDuration(this.duration);
  }
  next();
});



contestSchema.statics.findByPlatformAndId = function (platform, contestId) {
  return this.findOne({ platform: platform.toLowerCase(), contestId: String(contestId) });
};


contestSchema.statics.findByPlatform = function (platform, options = {}) {
  const { limit = 50, skip = 0 } = options;
  return this.find({ platform: platform.toLowerCase() })
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(limit);
};


contestSchema.statics.upsertContest = function (contestData) {
  const { platform, contestId, ...updateFields } = contestData;

  if (updateFields.duration) {
    updateFields.durationFormatted = Contest.formatDuration(updateFields.duration);
  }

  const stringId = String(contestId);

  return this.findOneAndUpdate(
    { platform: platform.toLowerCase(), contestId: stringId },
    { $set: { platform: platform.toLowerCase(), contestId: stringId, ...updateFields } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
};


contestSchema.statics.bulkUpsertContests = function (contests) {
  if (!contests || contests.length === 0) return Promise.resolve({ modifiedCount: 0, upsertedCount: 0 });

  const operations = contests.map((contest) => ({
    updateOne: {
      filter: { platform: contest.platform.toLowerCase(), contestId: String(contest.contestId) },
      update: {
        $set: {
          ...contest,
          contestId: String(contest.contestId),
          platform: contest.platform.toLowerCase(),
          durationFormatted: contest.duration ? Contest.formatDuration(contest.duration) : '',
        },
      },
      upsert: true,
    },
  }));

  return this.bulkWrite(operations, { ordered: false });
};


contestSchema.statics.countByPlatform = function () {
  return this.aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};


contestSchema.statics.formatDuration = function (seconds) {
  if (!seconds || seconds <= 0) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};



contestSchema.methods.isFinished = function () {
  return this.phase === 'FINISHED';
};


contestSchema.methods.getEndTime = function () {
  return new Date(this.startTime.getTime() + this.duration * 1000);
};


const Contest = mongoose.model('Contest', contestSchema);

module.exports = Contest;
