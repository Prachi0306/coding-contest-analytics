const mongoose = require('mongoose');

// ─── Constants ──────────────────────────────────────────

const PLATFORMS = ['codeforces', 'leetcode', 'codechef'];
const CONTEST_PHASES = ['BEFORE', 'CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST', 'FINISHED'];
const CONTEST_TYPES = ['CF', 'IOI', 'ICPC', 'OTHER'];

// ─── Schema Definition ─────────────────────────────────

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
      type: Number, // Duration in seconds
      required: [true, 'Duration is required'],
      min: [0, 'Duration cannot be negative'],
    },

    durationFormatted: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
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

// ─── Indexes ────────────────────────────────────────────

// Compound unique index: one entry per contest per platform
contestSchema.index({ platform: 1, contestId: 1 }, { unique: true });

// Index for querying contests by platform and start time (sorted)
contestSchema.index({ platform: 1, startTime: -1 });

// Text index for contest search by name
contestSchema.index({ name: 'text' });

// ─── Pre-save Middleware ────────────────────────────────

/**
 * Auto-generate durationFormatted before saving.
 */
contestSchema.pre('save', function (next) {
  if (this.isModified('duration')) {
    this.durationFormatted = Contest.formatDuration(this.duration);
  }
  next();
});

// ─── Static Methods ─────────────────────────────────────

/**
 * Find a contest by platform + contestId combination.
 * @param {string} platform - Platform name
 * @param {number} contestId - Platform-specific contest ID
 * @returns {Promise<Document|null>}
 */
contestSchema.statics.findByPlatformAndId = function (platform, contestId) {
  return this.findOne({ platform: platform.toLowerCase(), contestId: String(contestId) });
};

/**
 * Find all contests for a given platform, sorted by start time (newest first).
 * @param {string} platform - Platform name
 * @param {object} [options] - { limit, skip }
 * @returns {Promise<Array<Document>>}
 */
contestSchema.statics.findByPlatform = function (platform, options = {}) {
  const { limit = 50, skip = 0 } = options;
  return this.find({ platform: platform.toLowerCase() })
    .sort({ startTime: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Upsert a contest — insert if not exists, update if it does.
 * Idempotent: safe to call multiple times with the same data.
 * @param {object} contestData - Contest data to upsert
 * @returns {Promise<Document>}
 */
contestSchema.statics.upsertContest = function (contestData) {
  const { platform, contestId, ...updateFields } = contestData;

  // Auto-format duration if present
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

/**
 * Bulk upsert contests — idempotent batch insert/update.
 * @param {Array<object>} contests - Array of contest data objects
 * @returns {Promise<object>} Bulk write result
 */
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

/**
 * Get the count of contests per platform.
 * @returns {Promise<Array<{ _id: string, count: number }>>}
 */
contestSchema.statics.countByPlatform = function () {
  return this.aggregate([
    { $group: { _id: '$platform', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
};

/**
 * Format duration in seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
contestSchema.statics.formatDuration = function (seconds) {
  if (!seconds || seconds <= 0) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
};

// ─── Instance Methods ───────────────────────────────────

/**
 * Check if this contest has finished.
 * @returns {boolean}
 */
contestSchema.methods.isFinished = function () {
  return this.phase === 'FINISHED';
};

/**
 * Get the end time of this contest.
 * @returns {Date}
 */
contestSchema.methods.getEndTime = function () {
  return new Date(this.startTime.getTime() + this.duration * 1000);
};

// ─── Model ──────────────────────────────────────────────

const Contest = mongoose.model('Contest', contestSchema);

module.exports = Contest;
