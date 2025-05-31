import pino from 'pino';

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

// Helper to check if we're in Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node;

// File logging variables (initialized later)
let appFileLogger: any = null;
let errorFileLogger: any = null;
let fileLoggingInitialized = false;

// Track child loggers to update them when file logging is ready
const childLoggers: any[] = [];

// Convert numeric log levels to Pino string levels
const getLogLevel = (logLevel: string | undefined): string => {
    if (!logLevel) return 'info';

    // If it's already a valid Pino level string, use it
    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    if (validLevels.includes(logLevel.toLowerCase())) {
        return logLevel.toLowerCase();
    }

    // Convert numeric levels to string levels
    const numericLevel = parseInt(logLevel, 10);
    if (!isNaN(numericLevel)) {
        switch (numericLevel) {
            case 0: return 'error';   // Minimal logging
            case 1: return 'warn';    // Warnings and errors
            case 2: return 'info';    // Info, warnings, and errors  
            case 3: return 'debug';   // Debug and above
            default: return 'info';   // Default fallback
        }
    }

    // Fallback for invalid values
    return 'info';
};

// Helper function to get environment variables
const getEnvVar = (name: string, defaultValue?: string): string => {
    if (isNodeEnvironment) {
        return process.env[name] ?? defaultValue ?? '';
    }
    return defaultValue ?? '';
};

// Create comprehensive redaction configuration
const createMainLoggerRedactionConfig = () => ({
    paths: [
        // Direct sensitive field names
        'password',
        'token',
        'authorization',
        'cookie',
        'accesstoken',
        'refreshtoken',
        'secret',
        'apikey',
        'confirmpassword',
        'oldpassword',
        'newpassword',

        // HTTP request/response paths
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.body.password',
        'req.body.token',
        'req.body.secret',
        'res.headers["set-cookie"]',
        'res.headers.authorization',
        'res.body.password',
        'res.body.token',

        // Client data paths
        'data.password',
        'data.token',
        'data.secret',
        'data.authorization',

        // Wildcard patterns for nested sensitive fields
        '*.password',
        '*.token',
        '*.authorization',
        '*.cookie',
        '*.secret',
        '*.apikey',
        '*.accesstoken',
        '*.refreshtoken',

        // Array patterns
        'logs[*].password',
        'logs[*].token',
        'data[*].password',
        'data[*].secret'
    ],
    censor: REDACTION_MARKER,
    remove: false
});

// Create the logger with console-only output for now
const logger = pino({
    level: getLogLevel(getEnvVar('LOG_LEVEL')),
    base: {
        service: 'lessons-marketplace',
        environment: getEnvVar('NODE_ENV', 'development'),
    },
    timestamp: pino.stdTimeFunctions.isoTime,

    // Console transport configuration
    transport: getEnvVar('NODE_ENV') === 'development' && getEnvVar('SHOW_TEST_LOGS') !== 'false' ? {
        target: 'pino-pretty',
        level: 'debug',
        options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname,service,environment',
            singleLine: false,
            hideObject: false,
            messageFormat: '{component} | {msg}',
        }
    } : getEnvVar('NODE_ENV') === 'test' || getEnvVar('SHOW_TEST_LOGS') === 'false' ? {
        // During test runs or when explicitly disabled, suppress output
        target: 'pino/file',
        options: {
            destination: (isNodeEnvironment && process.platform === 'win32') ? 'NUL' : '/dev/null'
        }
    } : undefined,

    // Apply comprehensive redaction using Pino's built-in capabilities
    redact: createMainLoggerRedactionConfig(),
});

// Initialize file logging synchronously in Node.js environment
const initializeFileLogging = async () => {
    if (!isNodeEnvironment || fileLoggingInitialized) return;

    try {
        const fileLoggerModule = await import('../server/config/fileLogger.js');
        appFileLogger = fileLoggerModule.appFileLogger;
        errorFileLogger = fileLoggerModule.errorFileLogger;

        // Override main logger methods to write to both console and files
        const originalInfo = logger.info.bind(logger);
        const originalWarn = logger.warn.bind(logger);
        const originalError = logger.error.bind(logger);
        const originalDebug = logger.debug.bind(logger);

        logger.info = (obj: any, msg?: string, ...args: any[]) => {
            originalInfo(obj, msg, ...args);
            if (appFileLogger) appFileLogger.info(obj, msg, ...args);
        };

        logger.warn = (obj: any, msg?: string, ...args: any[]) => {
            originalWarn(obj, msg, ...args);
            if (appFileLogger) appFileLogger.warn(obj, msg, ...args);
        };

        logger.error = (obj: any, msg?: string, ...args: any[]) => {
            originalError(obj, msg, ...args);
            if (appFileLogger) appFileLogger.error(obj, msg, ...args);
            if (errorFileLogger) errorFileLogger.error(obj, msg, ...args);
        };

        logger.debug = (obj: any, msg?: string, ...args: any[]) => {
            originalDebug(obj, msg, ...args);
            if (appFileLogger) appFileLogger.debug(obj, msg, ...args);
        };

        // Update all existing child loggers
        childLoggers.forEach(addFileLoggingToChildLogger);

        fileLoggingInitialized = true;
        logger.info('File logging initialized successfully');
    } catch (error) {
        console.warn('File logging initialization failed:', error);
    }
};

// Helper function to add file logging to a child logger
const addFileLoggingToChildLogger = (childLogger: any) => {
    if (!appFileLogger || !errorFileLogger) return;

    const originalChildInfo = childLogger.info.bind(childLogger);
    const originalChildWarn = childLogger.warn.bind(childLogger);
    const originalChildError = childLogger.error.bind(childLogger);
    const originalChildDebug = childLogger.debug.bind(childLogger);

    childLogger.info = (obj: any, msg?: string, ...args: any[]) => {
        originalChildInfo(obj, msg, ...args);
        if (appFileLogger) appFileLogger.info(obj, msg, ...args);
    };

    childLogger.warn = (obj: any, msg?: string, ...args: any[]) => {
        originalChildWarn(obj, msg, ...args);
        if (appFileLogger) appFileLogger.warn(obj, msg, ...args);
    };

    childLogger.error = (obj: any, msg?: string, ...args: any[]) => {
        originalChildError(obj, msg, ...args);
        if (appFileLogger) appFileLogger.error(obj, msg, ...args);
        if (errorFileLogger) errorFileLogger.error(obj, msg, ...args);
    };

    childLogger.debug = (obj: any, msg?: string, ...args: any[]) => {
        originalChildDebug(obj, msg, ...args);
        if (appFileLogger) appFileLogger.debug(obj, msg, ...args);
    };
};

// Create child loggers for different parts of the application
export const createChildLogger = (component: string, metadata: Record<string, any> = {}) => {
    const childLogger = logger.child({ component, ...metadata });

    // Track this child logger
    childLoggers.push(childLogger);

    // If file logging is already initialized, add file logging to this child
    if (fileLoggingInitialized) {
        addFileLoggingToChildLogger(childLogger);
    }

    return childLogger;
};

export { logger, initializeFileLogging };
export default logger; 