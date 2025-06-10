import express, { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../../config/logger.js';
import { getRouteGroup } from '../index.js';

// Extend Request interface to include id property
declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
    var _httpLoggerDebugLogged: boolean | undefined;
}

// Helper function to get environment variables with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
    return process.env[key] || fallback;
};

// Create a dedicated child logger for HTTP requests.
// This will inherit the main logger's configuration (level, formatters, redaction).
const httpLoggerInstance = createChildLogger('http-logs');

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

        // TEMPORARY DEBUGGING
        const structuredLogsEnv = getEnvVar('STRUCTURED_LOGS');
        // console.log(`[HTTP_LOGGER_DEBUG] STRUCTURED_LOGS env value: "${structuredLogsEnv}" for ${method} ${originalUrl}`);

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

                // Add routeGroup to customData for Alloy
                const routeGroup = getRouteGroup(method, originalUrl || url);
                fileLogData.customData = {
                    routeGroup: routeGroup,
                    testIdentifier: req.headers['x-test-id']
                };

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

                // The single httpLoggerInstance will handle both structured and pretty logging
                // based on the main logger's transport configuration.
                httpLoggerInstance[logLevel](fileLogData, terminalMessage);
            }
        }

        return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
}; 