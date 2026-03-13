// lib/infra/logger.js

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[Deno.env.get("LOG_LEVEL") || "info"];

function formatLog(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...data,
  };
  return JSON.stringify(logEntry);
}

export const logger = {
  debug(message, data) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(formatLog("debug", message, data));
    }
  },
  info(message, data) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(formatLog("info", message, data));
    }
  },
  warn(message, data) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog("warn", message, data));
    }
  },
  error(message, data) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatLog("error", message, data));
    }
  },
};
