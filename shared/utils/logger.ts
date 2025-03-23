/**
 * Shared logger utility to control log levels based on environment
 * Can be used by both frontend and backend
 */

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Interface for environment variables needed by the logger
export interface LoggerEnv {
  DEBUG?: string;
  LOG_LEVEL?: string;
  NODE_ENV?: string;
  MODE?: string; // For Vite/frontend
}

/**
 * Get the log level from environment variables
 * @param env The environment variables object (process.env or import.meta.env)
 */
export const getLogLevelFromEnv = (env: LoggerEnv): LogLevel => {
  // If DEBUG=true is set, use DEBUG log level regardless of LOG_LEVEL
  if (env.DEBUG === 'true') {
    return LogLevel.DEBUG;
  }

  // Otherwise, read from LOG_LEVEL env variable
  const logLevelStr = env.LOG_LEVEL;
  if (logLevelStr !== undefined) {
    const level = parseInt(logLevelStr, 10);
    // Ensure the log level is valid
    if (!isNaN(level) && level >= 0 && level <= 3) {
      return level as LogLevel;
    }
  }

  // Default based on environment
  const isProduction = env.NODE_ENV === 'production' || env.MODE === 'production';
  return isProduction ? LogLevel.ERROR : LogLevel.INFO;
};

/**
 * Create a Logger class instance
 * 
 * @param initialLogLevel The initial log level to use
 * @param logFunctions Object containing the logging functions to use (for environment-specific console access)
 */
export class Logger {
  private currentLogLevel: LogLevel;

  constructor(
    initialLogLevel: LogLevel,
    private logFunctions: {
      error: (message: string, ...data: any[]) => void;
      warn: (message: string, ...data: any[]) => void;
      info: (message: string, ...data: any[]) => void;
      debug: (message: string, ...data: any[]) => void;
    } = {
      error: console.error,
      warn: console.warn,
      info: console.log,
      debug: console.log
    }
  ) {
    this.currentLogLevel = initialLogLevel;
  }

  /**
   * Set the log level
   * @param level The new log level to set
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Get the current log level
   */
  getLogLevel(): LogLevel {
    return this.currentLogLevel;
  }

  /**
   * Log an error message - always displayed
   * @param message The message to log
   * @param data Optional data to log
   */
  error(message: string, ...data: any[]): void {
    this.logFunctions.error(`[ERROR] ${message}`, ...data);
  }

  /**
   * Log a warning message - displayed at LOG_LEVEL WARN or higher
   * @param message The message to log
   * @param data Optional data to log
   */
  warn(message: string, ...data: any[]): void {
    if (this.currentLogLevel >= LogLevel.WARN) {
      this.logFunctions.warn(`[WARN] ${message}`, ...data);
    }
  }

  /**
   * Log an info message - displayed at LOG_LEVEL INFO or higher
   * @param message The message to log
   * @param data Optional data to log
   */
  info(message: string, ...data: any[]): void {
    if (this.currentLogLevel >= LogLevel.INFO) {
      this.logFunctions.info(`[INFO] ${message}`, ...data);
    }
  }

  /**
   * Log a debug message - only displayed at LOG_LEVEL DEBUG
   * @param message The message to log
   * @param data Optional data to log
   */
  debug(message: string, ...data: any[]): void {
    if (this.currentLogLevel >= LogLevel.DEBUG) {
      this.logFunctions.debug(`[DEBUG] ${message}`, ...data);
    }
  }
} 