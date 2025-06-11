/**
 * Standard log levels used throughout the application.
 * These levels follow common logging conventions and are compatible with
 * various logging systems (Pino, Winston, etc.)
 */
export enum LogLevel {
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error',
    Fatal = 'fatal'
}

/**
 * Type guard to check if a string is a valid LogLevel
 */
export function isLogLevel(level: string): level is LogLevel {
    return Object.values(LogLevel).includes(level as LogLevel);
}

/**
 * Convert any string to a valid LogLevel, defaulting to Info if invalid
 */
export function toLogLevel(level: string): LogLevel {
    const normalizedLevel = level.toLowerCase();
    return isLogLevel(normalizedLevel) ? normalizedLevel as LogLevel : LogLevel.Info;
} 