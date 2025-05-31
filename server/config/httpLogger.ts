import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger.js';
import { getRouteGroup } from '../index.js';
import pino from 'pino';

// Extend Request interface to include id property
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
    var _httpLoggerDebugLogged: boolean | undefined;
}

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

// Helper function to get environment variables with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
    return process.env[key] || fallback;
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

// Import the shared redaction configuration and file logger
let createRedactionConfig: any = null;
let httpFileLogger: any = null;
let httpTerminalLogger: any = null;

// Fallback redaction configuration if import fails
const createFallbackRedactionConfig = () => ({
    paths: [
        // Basic sensitive fields
        'password',
        'token',
        'authorization',
        'cookie',
        'secret',
        'apikey',

        // HTTP specific paths
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.token',
        'res.headers["set-cookie"]',
        'res.body.password',
        'res.body.token',

        // Wildcards
        '*.password',
        '*.token',
        '*.secret',
        '*.authorization'
    ],
    censor: REDACTION_MARKER,
    remove: false
});

// Initialize loggers after importing shared configuration
if (typeof process !== 'undefined' && process.versions?.node) {
    import('./fileLogger.js').then(fileLoggerModule => {
        httpFileLogger = fileLoggerModule.httpFileLogger;
        createRedactionConfig = fileLoggerModule.createRedactionConfig;

        // Create the terminal logger with proper redaction config
        httpTerminalLogger = pino({
            level: getLogLevel(getEnvVar('LOG_LEVEL')),
            base: {},
            redact: createRedactionConfig(),
            transport: getEnvVar('NODE_ENV') === 'development' ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    singleLine: false,
                    hideObject: true,
                    messageFormat: 'http | {msg}',
                }
            } : undefined
        });
    }).catch(error => {
        console.warn('HTTP logging initialization failed, using fallback:', error);

        // Create fallback logger
        httpTerminalLogger = pino({
            level: getLogLevel(getEnvVar('LOG_LEVEL')),
            base: {},
            redact: createFallbackRedactionConfig(),
            transport: getEnvVar('NODE_ENV') === 'development' ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    singleLine: false,
                    hideObject: true,
                    messageFormat: 'http | {msg}',
                }
            } : undefined
        });
    });
} else {
    // Browser environment fallback
    httpTerminalLogger = pino({
        level: getLogLevel(getEnvVar('LOG_LEVEL')),
        base: {},
        redact: createFallbackRedactionConfig()
    });
}

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

            // Create structured log object for file - Pino redaction will handle sensitive data
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

            // Add request data if it exists - no manual scrubbing needed, Pino handles it
            if ((req as any).body && Object.keys((req as any).body).length > 0) {
                // For terminal: add request body to message (only in development)
                if (method !== 'GET' && getEnvVar('NODE_ENV') === 'development') {
                    const bodyStr = JSON.stringify((req as any).body);
                    // Add yellow color to the req body for better visibility
                    terminalMessage += ` \x1b[33mreq: ${bodyStr}\x1b[0m`;
                }

                // For file: add as structured data - Pino will redact sensitive fields
                fileLogData.req = {
                    headers: req.headers,
                    query: req.query,
                    params: req.params,
                    body: (req as any).body
                };
            } else {
                fileLogData.req = {
                    headers: req.headers,
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

            // Add response data if it exists - Pino will redact sensitive fields
            if (parsedResponseBody) {
                fileLogData.res = {
                    headers: res.getHeaders(),
                    body: parsedResponseBody
                };
            } else {
                fileLogData.res = {
                    headers: res.getHeaders()
                };
            }

            // Log to terminal (clean message with request body for readability)
            // Pino redaction will handle any sensitive data in the message
            // Show terminal logs by default, hide only when SHOW_TEST_LOGS is explicitly set to 'false'
            const showTestLogs = getEnvVar('SHOW_TEST_LOGS') !== 'false';
            const isProduction = getEnvVar('NODE_ENV') === 'production';
            const shouldShowTerminalLogs = showTestLogs || isProduction;

            if (httpTerminalLogger && shouldShowTerminalLogs) {
                httpTerminalLogger[logLevel](terminalMessage);
            } else if (!httpTerminalLogger && shouldShowTerminalLogs) {
                // Fallback to console logging if httpTerminalLogger isn't ready yet
                console.log(`[HTTP] ${terminalMessage}`);
            }

            // Log to file (structured JSON with detailed request/response data)
            // Pino redaction will automatically handle sensitive data in the structured object
            if (httpFileLogger) {
                // Create a child logger with routeGroup as a proper label for Loki
                const routeGroup = getRouteGroup(method, originalUrl || url);
                const routeGroupLogger = httpFileLogger.child({ routeGroup });

                // Remove routeGroup from fileLogData since it's now a label
                const { routeGroup: _, ...fileLogDataWithoutRouteGroup } = fileLogData;

                routeGroupLogger.info(fileLogDataWithoutRouteGroup, `HTTP ${method} ${url} ${status} ${responseTime}ms`);
            }
        }

        // Call the original end function
        return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
}; 