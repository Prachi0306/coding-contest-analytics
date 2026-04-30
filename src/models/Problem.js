const mongoose = require('mongoose');


const problemSchema = new mongoose.Schema(
  {
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
    name: {
      type: String,
      required: [true, 'Problem name is required'],
      trim: true,
      maxlength: [300, 'Problem name must not exceed 300 characters'],
    },
    index: {
      type: String,
      trim: true,
      default: '',
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: ['codeforces', 'leetcode', 'codechef'],
      lowercase: true,
      trim: true,
    },
    difficulty: {
      type: String,
      default: '',
      trim: true,
    },
    url: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

problemSchema.index({ contestId: 1, problemId: 1, platform: 1 }, { unique: true });

const Problem = mongoose.model('Problem', problemSchema);

module.exports = Problem;
