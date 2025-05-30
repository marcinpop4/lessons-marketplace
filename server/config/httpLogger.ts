import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger.js';
import pino from 'pino';

// Extend Request interface to include id property
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

// Helper function to get environment variables
const getEnvVar = (name: string): string | undefined => {
    return process.env[name];
};

// Convert numeric log levels to Pino string levels (duplicate from main logger)
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

// Create a separate file logger for complete HTTP details (for Grafana aggregation)
const httpFileLogger = pino({
    level: 'debug',
    base: {
        service: 'lessons-marketplace',
        component: 'http-requests'
    },
    transport: {
        target: 'pino/file',
        options: {
            destination: './logs/http.log',
            mkdir: true
        }
    },
    // Redact sensitive information in file logs too
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
});

// Create a terminal-only logger for clean HTTP messages
const httpTerminalLogger = pino({
    level: getLogLevel(getEnvVar('LOG_LEVEL')), // Respect LOG_LEVEL setting
    base: {}, // No base metadata to avoid component showing up
    transport: getEnvVar('NODE_ENV') === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false, // Each log entry on its own line
            hideObject: true, // Hide any structured data
            messageFormat: 'http | {msg}',
        }
    } : undefined
});

// Security scrubbing function for sensitive data
const scrubSensitiveData = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => scrubSensitiveData(item));
    }

    const scrubbed: { [key: string]: any } = {};
    const sensitiveKeys = ['password', 'token', 'authorization', 'cookie', 'accesstoken', 'secret', 'apikey'];

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
                scrubbed[key] = '[SCRUBBED]';
            } else {
                scrubbed[key] = scrubSensitiveData(obj[key]);
            }
        }
    }
    return scrubbed;
};

// Create a simple HTTP logger middleware that only logs clean messages
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Generate a unique request ID
    req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Capture response body for file logging
    let responseBody = '';
    const originalWrite = res.write;
    const originalEnd = res.end;

    // Override res.write to capture response data for file logging
    res.write = function (chunk: any, encoding?: any, cb?: any) {
        if (chunk) {
            responseBody += chunk.toString();
        }
        return originalWrite.call(this, chunk, encoding, cb);
    };

    // Override res.end to log when response is sent
    res.end = function (chunk?: any, encoding?: any, cb?: any) {
        if (chunk) {
            responseBody += chunk.toString();
        }

        const responseTime = Date.now() - start;
        const method = req.method;
        const url = req.url;
        const status = res.statusCode;

        // Hide internal logging framework calls unless in debug mode
        const originalUrl = req.originalUrl || req.url;
        if (originalUrl?.includes('/api/v1/logs') && getEnvVar('LOG_LEVEL') !== '3' && !getEnvVar('DEBUG')) {
            // Silently skip logging for client logging API calls
        } else {
            // Determine log level based on status code
            let logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info';

            if (status >= 500) {
                logLevel = 'error';
            } else if (status >= 400) {
                logLevel = 'warn';
            } else if (status >= 300) {
                // For redirects and 304s, use debug level in development to reduce noise
                logLevel = getEnvVar('NODE_ENV') === 'development' ? 'debug' : 'info';
            }

            // Build the clean terminal message
            let terminalMessage = `${method} ${url} ${status} ${responseTime}ms`;

            // Create structured log object for file
            const fileLogData: any = {
                reqId: req.id,
                method,
                url: originalUrl || url,
                status,
                responseTime,
                userAgent: req.get('user-agent'),
                ip: req.ip,
                forwardedFor: req.get('x-forwarded-for'),
            };

            // Add request data if it exists
            if ((req as any).body && Object.keys((req as any).body).length > 0) {
                const scrubbedBody = scrubSensitiveData((req as any).body);

                // For terminal: add request body to message (only in development)
                if (method !== 'GET' && getEnvVar('NODE_ENV') === 'development') {
                    const bodyStr = JSON.stringify(scrubbedBody);
                    // Add yellow color to the req body for better visibility
                    terminalMessage += ` \x1b[33mreq: ${bodyStr}\x1b[0m`;
                }

                // For file: add as structured data
                fileLogData.req = {
                    headers: scrubSensitiveData(req.headers),
                    query: req.query,
                    params: req.params,
                    body: scrubbedBody
                };
            } else {
                fileLogData.req = {
                    headers: scrubSensitiveData(req.headers),
                    query: req.query,
                    params: req.params
                };
            }

            // Log complete structured data to file for Grafana aggregation
            let parsedResponseBody = null;
            try {
                if (responseBody) {
                    parsedResponseBody = JSON.parse(responseBody);
                }
            } catch (e) {
                // Keep as string if not JSON
                parsedResponseBody = responseBody;
            }

            // Add response data if it exists
            if (parsedResponseBody) {
                fileLogData.res = {
                    headers: scrubSensitiveData(res.getHeaders()),
                    body: scrubSensitiveData(parsedResponseBody)
                };
            } else {
                fileLogData.res = {
                    headers: scrubSensitiveData(res.getHeaders())
                };
            }

            // Log to terminal (clean message with request body for readability)
            httpTerminalLogger[logLevel](terminalMessage);

            // Log to file (structured JSON without request body in message)
            httpFileLogger.info(fileLogData, `HTTP ${method} ${url} ${status} ${responseTime}ms`);
        }

        // Call the original end function
        return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
}; 