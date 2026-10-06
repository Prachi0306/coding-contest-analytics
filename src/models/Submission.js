const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    externalSubmissionId: {
      type: String,
      required: false,
      sparse: true, // Some manual submissions might not have one, or we can enforce it.
    },
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
      index: true,
    },
    verdict: {
      type: String,
      default: 'OK', 
      trim: true,
    },
    isDuringContest: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ externalSubmissionId: 1, contestId: 1 }, { unique: true, partialFilterExpression: { externalSubmissionId: { $exists: true, $type: "string" } } });
submissionSchema.index({ userId: 1, contestId: 1, problemId: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
