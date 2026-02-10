const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'data');
const logFile = path.join(logDir, 'monitor.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || LOG_LEVELS.info;

/**
 * Format log message
 */
function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Write to log file
 */
function writeLog(level, message) {
  const formatted = formatMessage(level, message);
  
  // Console output
  console.log(formatted);
  
  // File output
  try {
    fs.appendFileSync(logFile, formatted + '\n');
  } catch (error) {
    console.error(`Failed to write to log file: ${error.message}`);
  }
}

/**
 * Log error
 */
function error(message) {
  if (currentLogLevel >= LOG_LEVELS.error) {
    writeLog('error', message);
  }
}

/**
 * Log warning
 */
function warn(message) {
  if (currentLogLevel >= LOG_LEVELS.warn) {
    writeLog('warn', message);
  }
}

/**
 * Log info
 */
function info(message) {
  if (currentLogLevel >= LOG_LEVELS.info) {
    writeLog('info', message);
  }
}

/**
 * Log debug
 */
function debug(message) {
  if (currentLogLevel >= LOG_LEVELS.debug) {
    writeLog('debug', message);
  }
}

module.exports = {
  error,
  warn,
  info,
  debug
};
