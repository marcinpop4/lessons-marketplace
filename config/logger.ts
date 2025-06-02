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

// Create child loggers for different parts of the application
export const createChildLogger = (component: string, metadata: Record<string, any> = {}) => {
    const childLogger = logger.child({ component, ...metadata });

    return childLogger;
};

// Create a global log method that can be used by frontend builds, and have predictable results
export const createApplicationLogger = (env?: 'development' | 'test' | 'production') => {
    return logger;
};

// Export the main logger
export { logger }; 