import { createWriteStream } from 'fs';
import { mkdirSync, existsSync } from 'fs';
import * as rfs from 'rotating-file-stream';
import pino from 'pino';

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

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

// Create rotating file streams
const createRotatingStream = (filename: string) => {
    return rfs.createStream(filename, {
        path: logsDir,
        size: '20M',        // Rotate when file reaches 20MB
        interval: '1d',     // Rotate daily
        maxFiles: 14,       // Keep 14 days of logs
        compress: 'gzip',   // Compress old files
    });
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
export const appLogStream = createRotatingStream('app.log');
export const httpLogStream = createRotatingStream('http.log');
export const clientLogStream = createRotatingStream('client.log');
export const errorLogStream = createRotatingStream('error.log');

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