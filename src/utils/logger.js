const winston = require('winston');
const path = require('path');
const config = require('../config');

// ─── Custom Log Format ──────────────────────────────
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}${metaStr}${stackStr}`;
  })
);

// ─── Console Format (colorized for dev) ─────────────
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} ${level} ${message}${metaStr}${stackStr}`;
  })
);

// ─── Transports ─────────────────────────────────────
const transports = [];

// Always log to console
transports.push(
  new winston.transports.Console({
    format: config.env === 'development' ? consoleFormat : logFormat,
  })
);

// File transports for non-test environments
if (config.env !== 'test') {
  const logsDir = path.resolve(__dirname, '../../logs');

  // All logs → combined.log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
      format: logFormat,
    })
  );

  // Error logs → error.log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
      format: logFormat,
    })
  );
}

// ─── Logger Instance ────────────────────────────────
const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'coding-contest-analytics' },
  transports,
  // Don't exit on uncaught exceptions — let server.js handle them
  exitOnError: false,
});

// ─── Morgan Stream (for HTTP request logging) ───────
logger.stream = {
  write: (message) => {
    // Remove trailing newline from Morgan output
    logger.http(message.trim());
  },
};

module.exports = logger;
