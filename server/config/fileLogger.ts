import { createWriteStream } from 'fs';
import { mkdirSync, existsSync } from 'fs';
import * as rfs from 'rotating-file-stream';
import pino from 'pino';

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
    redact: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]'
    ],
}, appLogStream);

export const errorFileLogger = pino({
    level: 'error',
    base: {
        service: 'lessons-marketplace',
        environment: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]'
    ],
}, errorLogStream);

export const httpFileLogger = pino({
    level: 'debug',
    base: {
        service: 'lessons-marketplace',
        component: 'http-requests'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'req.body.password',
        'res.body.token',
        'res.body.accessToken'
    ],
}, httpLogStream);

export const clientFileLogger = pino({
    level: 'debug',
    base: {
        service: 'lessons-marketplace',
        component: 'client-logs'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]'
    ],
}, clientLogStream); 