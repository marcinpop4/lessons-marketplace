import pino from 'pino';

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

// Helper to check if we're in Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions?.node;

// Helper function to get environment variables with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
    return (typeof process !== 'undefined' ? process.env[key] : undefined) || fallback;
};

// Check if we should use Docker native logging
const useDockerLogging = getEnvVar('USE_DOCKER_LOGGING') === 'true';

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

// Create comprehensive redaction configuration using Pino's built-in capabilities
const createMainLoggerRedactionConfig = (additionalPaths: string[] = []) => ({
    paths: [
        // Direct sensitive field names (top-level) - both snake_case and camelCase
        'password',
        'token',
        'authorization',
        'cookie',
        'accesstoken',
        'accessToken',
        'refreshtoken',
        'refreshToken',
        'secret',
        'apikey',
        'apiKey',
        'confirmpassword',
        'confirmPassword',
        'oldpassword',
        'oldPassword',
        'newpassword',
        'newPassword',

        // Single-level wildcard patterns for nested sensitive fields
        '*.password',
        '*.token',
        '*.authorization',
        '*.cookie',
        '*.accesstoken',
        '*.accessToken',
        '*.refreshtoken',
        '*.refreshToken',
        '*.secret',
        '*.apikey',
        '*.apiKey',
        '*.confirmpassword',
        '*.confirmPassword',
        '*.oldpassword',
        '*.oldPassword',
        '*.newpassword',
        '*.newPassword',

        // HTTP request/response specific paths (most commonly needed)
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.body.password',
        'req.body.token',
        'req.body.authorization',
        'req.body.secret',
        'req.body.apikey',
        'req.body.apiKey',
        'req.body.accessToken',
        'req.body.refreshToken',

        'res.headers["set-cookie"]',
        'res.headers.authorization',
        'res.body.password',
        'res.body.token',
        'res.body.authorization',
        'res.body.secret',
        'res.body.apikey',
        'res.body.apiKey',
        'res.body.accessToken',
        'res.body.refreshToken',

        // Client/data specific paths
        'data.password',
        'data.token',
        'data.authorization',
        'data.cookie',
        'data.secret',
        'data.apikey',
        'data.apiKey',
        'data.accessToken',
        'data.refreshToken',

        // User object specific paths
        'user.password',
        'user.token',
        'user.authorization',
        'user.secret',
        'user.apikey',
        'user.apiKey',
        'user.accessToken',
        'user.refreshToken',

        // Form data specific paths
        'form.password',
        'form.token',
        'form.authorization',
        'form.secret',
        'form.apikey',
        'form.apiKey',
        'form.accessToken',
        'form.refreshToken',

        // Additional custom paths
        ...additionalPaths
    ],
    censor: REDACTION_MARKER,
    remove: false
});

// Create the logger with appropriate transport based on environment
const createLoggerTransport = () => {
    // Check STRUCTURED_LOGS first - this overrides other settings
    const structuredLogs = getEnvVar('STRUCTURED_LOGS');

    if (structuredLogs === 'true') {
        // Force structured JSON output
        return undefined;
    }

    if (structuredLogs === 'false') {
        // Force human-readable output
        return {
            target: 'pino-pretty',
            level: 'debug',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname,service,environment,component',
                singleLine: true,
                hideObject: false,
                messageFormat: '{component} | {msg}',
            }
        };
    }

    // If STRUCTURED_LOGS is not set, check for explicit suppression
    if (getEnvVar('SHOW_TEST_LOGS') === 'false') {
        // Explicitly disabled - suppress output
        return {
            target: 'pino/file',
            options: {
                destination: (isNodeEnvironment && process.platform === 'win32') ? 'NUL' : '/dev/null'
            }
        };
    }

    // Check if we should use Docker native logging as fallback
    if (useDockerLogging) {
        // Docker environment: output raw JSON to stdout
        return undefined;
    }

    // Default fallback: human-readable output
    return {
        target: 'pino-pretty',
        level: 'debug',
        options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname,service,environment,component',
            singleLine: true,
            hideObject: false,
            messageFormat: '{component} | {msg}',
        }
    };
};

// Create the logger
const logger = pino({
    level: getLogLevel(getEnvVar('LOG_LEVEL')),
    base: {
        service: 'lessons-marketplace',
        environment: getEnvVar('NODE_ENV', 'development'),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: createLoggerTransport(),
    redact: createMainLoggerRedactionConfig(),
});

// Initialize file logging synchronously in Node.js environment (only if not using Docker logging)
const initializeFileLogging = async () => {
    if (!isNodeEnvironment || fileLoggingInitialized || useDockerLogging) return;

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

// Helper function to add file logging to a child logger (only if not using Docker logging)
const addFileLoggingToChildLogger = (childLogger: any) => {
    if (!appFileLogger || !errorFileLogger || useDockerLogging) return;

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

    // If file logging is already initialized and not using Docker logging, add file logging to this child
    if (fileLoggingInitialized && !useDockerLogging) {
        addFileLoggingToChildLogger(childLogger);
    }

    return childLogger;
};

// Create a global log method that can be used by frontend builds, and have predictable results
export const createApplicationLogger = (env?: 'development' | 'test' | 'production') => {
    return logger;
};

// Export the main logger
export { logger };

// Export initializeFileLogging for server/index.ts compatibility
export { initializeFileLogging };

// Initialize file logging in Node.js environment (skip if using Docker logging)
if (isNodeEnvironment && !useDockerLogging) {
    initializeFileLogging();
} else if (isNodeEnvironment && useDockerLogging) {
    logger.info('Using Docker native logging (stdout/stderr)');
} 