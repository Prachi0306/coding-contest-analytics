const mongoose = require('mongoose');

/**
 * SyncLog Schema — tracks background sync job executions.
 *
 * Every time the cron job runs, a log entry is created
 * to record the outcome, timing, and any errors.
 */
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

// Index for querying recent logs efficiently
syncLogSchema.index({ createdAt: -1 });

const SyncLog = mongoose.model('SyncLog', syncLogSchema);

module.exports = SyncLog;
