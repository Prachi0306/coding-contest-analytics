const mongoose = require('mongoose');


const syncLogSchema = new mongoose.Schema(
  {
    jobName: {
      type: String,
      required: [true, 'Job name is required'],
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      required: true,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

syncLogSchema.index({ createdAt: -1 });

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

module.exports = SyncLog;
