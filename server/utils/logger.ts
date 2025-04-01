/**
 * Server-side implementation of the shared logger
 */

// Use relative import to avoid circular dependency
import { Logger, LogLevel, getLogLevelFromEnv } from '../../shared/utils/logger.js';

// Initialize the logger with the current environment
const initialLogLevel = getLogLevelFromEnv(process.env);

// Create a logger instance
const logger = new Logger(initialLogLevel);

// Export the logger
export default logger;

// Re-export types and utilities from the shared implementation
export { LogLevel, getLogLevelFromEnv }; 