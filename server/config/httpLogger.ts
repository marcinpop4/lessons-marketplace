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

// Import the shared redaction configuration
let httpTerminalLogger: any = null;
let httpStructuredLogger: any = null;

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

        // HTTP specific paths - exact field names
        'req.headers.authorization',
        'req.headers.Authorization',
        'req.headers.cookie',
        'req.headers.Cookie',
        'req.body.password',
        'req.body.token',
        'res.headers["set-cookie"]',
        'res.body.password',
        'res.body.token',

        // Session-related exact paths
        'req.headers["x-session-token"]',
        'req.headers["x-auth-token"]',
        'req.headers["x-access-token"]',

        // Common JWT/Bearer token locations
        'req.headers["x-api-key"]',
        'req.headers["api-key"]',
        'req.headers["access-token"]',
        'req.headers["refresh-token"]',

        // Response sensitive headers
        'res.headers["authorization"]',
        'res.headers["Authorization"]',
        'res.headers["set-cookie"]',
        'res.headers["Set-Cookie"]',

        // Wildcards for nested objects (valid patterns only)
        '*.password',
        '*.token',
        '*.secret',
        '*.authorization',
        '*.cookie',
    ],
    censor: REDACTION_MARKER,
    remove: false
});

// Initialize loggers
if (typeof process !== 'undefined' && process.versions?.node) {
    // Create the terminal logger with proper redaction config
    httpTerminalLogger = pino({
        level: getLogLevel(getEnvVar('LOG_LEVEL')),
        base: {},
        redact: createFallbackRedactionConfig(),
        transport: getEnvVar('STRUCTURED_LOGS') === 'false' ? {
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

    // Create a structured logger for JSON output with redaction
    httpStructuredLogger = pino({
        level: getLogLevel(getEnvVar('LOG_LEVEL')),
        base: {},
        redact: createFallbackRedactionConfig(),
        // No transport = raw JSON output
    });
} else {
    // Browser environment fallback
    httpTerminalLogger = pino({
        level: getLogLevel(getEnvVar('LOG_LEVEL')),
        base: {},
        redact: createFallbackRedactionConfig()
    });

    httpStructuredLogger = httpTerminalLogger;
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
            // Check if we should quiet development noise (healthchecks, etc.)
            const quietDevLogs = getEnvVar('DEV_QUIET_LOGS') === 'true';

            // Skip healthcheck logs if DEV_QUIET_LOGS is enabled
            if (quietDevLogs && originalUrl?.includes('/health')) {
                // Silently skip healthcheck logs in quiet dev mode
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

                // Build the clean terminal message using originalUrl to show complete URL with query params
                let terminalMessage = `${method} ${originalUrl} ${status} ${responseTime}ms`;

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
                    // For terminal: add request body to message (only in development and human-readable mode)
                    if (method !== 'GET' && getEnvVar('NODE_ENV') === 'development') {
                        const bodyStr = JSON.stringify((req as any).body);
                        // Only add color codes when using human-readable logs (STRUCTURED_LOGS=false)
                        if (getEnvVar('STRUCTURED_LOGS') === 'false') {
                            // Add yellow color to the req body for better visibility in terminal
                            terminalMessage += ` \x1b[33mreq: ${bodyStr}\x1b[0m`;
                        } else {
                            // No color codes for structured JSON logs
                            terminalMessage += ` req: ${bodyStr}`;
                        }
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

                // Log to terminal - use different approaches based on STRUCTURED_LOGS
                if (getEnvVar('STRUCTURED_LOGS') === 'true') {
                    // Structured logs: use structured logger with redaction
                    const routeGroup = getRouteGroup(method, originalUrl || url);

                    // ONLY log essential fields - NO nested req/res objects to prevent field explosion
                    httpStructuredLogger[logLevel]({
                        service: 'lessons-marketplace',
                        component: 'http-logs',
                        reqId: req.id,
                        method,
                        url: originalUrl || url,
                        status,
                        responseTime,
                        userAgent: req.get('user-agent'),
                        ip: req.ip,
                        routeGroup,
                        // Do NOT include req/res objects - they cause field explosion in Loki
                    });
                } else {
                    // Human-readable logs: use formatted message
                    if (httpTerminalLogger) {
                        httpTerminalLogger[logLevel](terminalMessage);
                    } else if (!httpTerminalLogger) {
                        // Fallback to console logging if httpTerminalLogger isn't ready yet
                        console.log(`[HTTP] ${terminalMessage}`);
                    }
                }
            }
        }

        // Call the original end function
        return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
}; 