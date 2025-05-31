import { createWriteStream } from 'fs';
import { mkdirSync, existsSync } from 'fs';
import pino from 'pino';

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

// Helper function to get environment variables with fallbacks
const getEnvVar = (key: string, defaultValue: string = ''): string => {
    return (typeof process !== 'undefined' ? process.env[key] : undefined) || defaultValue;
};

// Convert numeric log levels to Pino string levels
const getLogLevel = (logLevel: string | undefined): string => {
    if (!logLevel) return 'info';

    const validLevels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    if (validLevels.includes(logLevel.toLowerCase())) {
        return logLevel.toLowerCase();
    }

    const numericLevel = parseInt(logLevel, 10);
    if (!isNaN(numericLevel)) {
        switch (numericLevel) {
            case 0: return 'error';
            case 1: return 'warn';
            case 2: return 'info';
            case 3: return 'debug';
            default: return 'info';
        }
    }

    return 'info';
};

// Create logs directory if it doesn't exist
const logsDir = './logs';
if (!existsSync(logsDir)) {
    mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a file stream compatible with Promtail and other log shippers.
 * 
 * For production environments, external log rotation (like logrotate) should be used
 * instead of built-in rotation to avoid issues with log shipping tools.
 * 
 * For development, we use simple appending file streams that work reliably with Promtail.
 */
const createLogStream = (filename: string) => {
    const isDevelopment = getEnvVar('NODE_ENV') === 'development';

    if (isDevelopment) {
        // In development, use simple file streams for Promtail compatibility
        // External rotation should be handled by logrotate or similar tools
        const filePath = `${logsDir}/${filename}`;
        return createWriteStream(filePath, { flags: 'a' });
    } else {
        // In production, you may want to use external log rotation (logrotate)
        // or a more sophisticated solution. For now, use the same simple approach.
        const filePath = `${logsDir}/${filename}`;
        return createWriteStream(filePath, { flags: 'a' });
    }
};

// Create comprehensive redaction configuration using Pino's built-in capabilities
export const createRedactionConfig = (additionalPaths: string[] = []) => ({
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
        'data.accesstoken',
        'data.accessToken',
        'data.refreshtoken',
        'data.refreshToken',

        // Array elements with sensitive data
        'users[*].password',
        'data[*].password',
        'data[*].token',
        'data[*].secret',
        'data[*].apikey',
        'data[*].apiKey',
        'logs[*].password',
        'logs[*].token',

        // Additional paths for specific loggers
        ...additionalPaths
    ],
    censor: REDACTION_MARKER,
    remove: false // Keep fields but redact values for debugging context
});

// Create specific streams for different log types
export const appLogStream = createLogStream('app.log');
export const httpLogStream = createLogStream('http.log');
export const clientLogStream = createLogStream('client.log');
export const errorLogStream = createLogStream('error.log');

// Create file loggers
export const appFileLogger = pino({
    level: getLogLevel(process.env.LOG_LEVEL),
    base: {
        service: 'lessons-marketplace',
        environment: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: createRedactionConfig(),
}, appLogStream);

export const errorFileLogger = pino({
    level: 'error',
    base: {
        service: 'lessons-marketplace',
        environment: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: createRedactionConfig(),
}, errorLogStream);

export const httpFileLogger = pino({
    level: 'debug',
    base: {
        service: 'lessons-marketplace',
        component: 'http-requests'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: createRedactionConfig([
        // Additional HTTP-specific paths
        'req.query.password',
        'req.query.token',
        'req.params.password',
        'req.params.token'
    ]),
}, httpLogStream);

export const clientFileLogger = pino({
    level: 'debug',
    base: {
        service: 'lessons-marketplace',
        component: 'client-logs'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: createRedactionConfig([
        // Additional client-specific paths
        'data.password',
        'data.token',
        'data.authorization',
        'data.cookie',
        'data.secret',
        'data.apikey'
    ]),
}, clientLogStream); 