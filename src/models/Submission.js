const mongoose = require('mongoose');

/**
 * Submission Schema — tracks a user's problem-solving status
 * for the Upsolving Tracker.
 *
 * Each entry represents whether a user solved a specific problem,
 * and importantly, whether it was solved during the contest or after (upsolve).
 */
const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contest',
      required: [true, 'Contest ID is required'],
      index: true,
    },
    problemId: {
      type: String,
      required: [true, 'Problem ID is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['solved', 'unsolved'],
      default: 'unsolved',
    },
    solvedDuringContest: {
      type: Boolean,
      default: false,
    },
    solvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: one submission record per user per problem per contest
submissionSchema.index({ userId: 1, contestId: 1, problemId: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
