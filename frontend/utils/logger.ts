/**
 * Frontend-side implementation of the shared logger
 */

import { Logger, LogLevel, getLogLevelFromEnv } from '@shared/utils/logger';

// Initialize the logger with the current environment
const initialLogLevel = getLogLevelFromEnv({
  DEBUG: import.meta.env.VITE_DEBUG,
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL,
  MODE: import.meta.env.MODE
});

// Create a logger instance
const logger = new Logger(initialLogLevel);

// Export the logger
export default logger;

// Re-export types and utilities from the shared implementation
export { LogLevel }; 