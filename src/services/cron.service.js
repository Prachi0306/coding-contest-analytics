const dataSyncService = require('./dataSync.service');
const SyncLog = require('../models/SyncLog');
const logger = require('../utils/logger');


class CronService {

  async syncContests() {
    const startTime = Date.now();
    const results = { codeforces: null, leetcode: null, codechef: null };
    const errors = [];

    logger.info('[CRON] Starting scheduled contest sync...');

    try {
      results.codeforces = await this._retry(
        () => dataSyncService.syncCodeforcesContests(),
        'Codeforces'
      );
    } catch (err) {
      errors.push({ platform: 'codeforces', message: err.message });
      logger.error('[CRON] Codeforces sync failed after retries', { error: err.message });
    }

    try {
      results.leetcode = await this._retry(
        () => dataSyncService.syncLeetCodeContests(),
        'LeetCode'
      );
    } catch (err) {
      errors.push({ platform: 'leetcode', message: err.message });
      logger.error('[CRON] LeetCode sync failed after retries', { error: err.message });
    }

    try {
      results.codechef = await this._retry(
        () => dataSyncService.syncCodeChefContests(),
        'CodeChef'
      );
    } catch (err) {
      errors.push({ platform: 'codechef', message: err.message });
      logger.error('[CRON] CodeChef sync failed after retries', { error: err.message });
    }

    const durationMs = Date.now() - startTime;
    let status = 'success';
    if (errors.length === 3) status = 'failed';
    else if (errors.length > 0) status = 'partial';

    try {
      await SyncLog.create({
        jobName: 'contest_sync',
        status,
        durationMs,
        details: results,
        error: errors.length > 0 ? JSON.stringify(errors) : null,
      });
    } catch (logErr) {
      logger.error('[CRON] Failed to save SyncLog', { error: logErr.message });
    }

    logger.info(`[CRON] Contest sync completed in ${durationMs}ms`, {
      status,
      errors: errors.length,
    });

    return { status, durationMs, results, errors };
  }


  async _retry(fn, label, maxRetries = 2) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt <= maxRetries) {
          const delay = attempt * 2000;
          logger.warn(`[CRON] ${label} attempt ${attempt} failed, retrying in ${delay}ms...`, {
            error: err.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

module.exports = new CronService();
