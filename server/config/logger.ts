import pino from 'pino';
import pinoHttp from 'pino-http';

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

// Sanitize sensitive fields from request body for console display
const sanitizeBody = (body: any): any => {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sensitiveFields = [
        'password', 'passwordConfirm', 'currentPassword', 'newPassword',
        'token', 'accessToken', 'refreshToken', 'authToken', 'jwt',
        'authorization', 'auth', 'apiKey', 'secret', 'privateKey',
        'cookie', 'session', 'sessionId', 'csrf', 'csrfToken',
        'creditCard', 'ccNumber', 'cvv', 'ssn', 'socialSecurityNumber'
    ];

    const sanitized = Array.isArray(body) ? [...body] : { ...body };

    const sanitizeRecursive = (obj: any): any => {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(sanitizeRecursive);
        }

        const result = { ...obj };
        for (const [key, value] of Object.entries(result)) {
            const lowerKey = key.toLowerCase();

            // Check if this key contains sensitive information
            if (sensitiveFields.some(sensitive => lowerKey.includes(sensitive))) {
                result[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                result[key] = sanitizeRecursive(value);
            }
        }
        return result;
    };

    return sanitizeRecursive(sanitized);
};

// Create the base logger
const logger = pino({
    level: getLogLevel(process.env.LOG_LEVEL),
    base: {
        service: 'lessons-marketplace',
        environment: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,

    // Pretty printing in development - or suppress entirely during tests
    transport: process.env.NODE_ENV === 'development' ?
        (process.env.SHOW_TEST_LOGS !== 'false' ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname,req,res,responseTime,service,environment,component',
                singleLine: false,
                hideObject: false,
                messageFormat: '{component} | {msg}',
            }
        } : {
            // During test runs with SHOW_TEST_LOGS=false, send logs to /dev/null
            target: 'pino/file',
            options: {
                destination: process.platform === 'win32' ? 'NUL' : '/dev/null'
            }
        }) : undefined,

    // Redact sensitive information
    redact: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]'
    ],
});

// Create HTTP logger (replaces Morgan)
const httpLogger = pinoHttp({
    logger,
    genReqId: (req, res) => {
        // Generate a unique request ID
        return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Custom request/response serializers for better security
    serializers: {
        req(req) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                body: (req as any).body, // Include parsed body
                headers: {
                    host: req.headers.host,
                    'user-agent': req.headers['user-agent'],
                    'content-type': req.headers['content-type'],
                    'content-length': req.headers['content-length'],
                    'x-forwarded-for': req.headers['x-forwarded-for'],
                    'x-real-ip': req.headers['x-real-ip'],
                    // Don't log authorization headers or cookies
                },
                remoteAddress: req.remoteAddress,
                remotePort: req.remotePort,
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
                headers: {
                    'content-type': typeof res.getHeader === 'function' ? res.getHeader('content-type') : undefined,
                    'content-length': typeof res.getHeader === 'function' ? res.getHeader('content-length') : undefined,
                    // Don't log set-cookie headers
                },
            };
        },
    },

    // Custom log level based on status code
    customLogLevel: function (req, res, err) {
        // Hide internal logging framework calls unless in debug mode
        const originalUrl = (req as any).originalUrl || req.url;
        if (originalUrl?.includes('/api/v1/logs') && process.env.LOG_LEVEL !== 'debug' && !process.env.DEBUG) {
            return 'debug'; // This will be hidden unless debug level is enabled
        }

        if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
        } else if (res.statusCode >= 500 || err) {
            return 'error';
        } else if (res.statusCode >= 300 && res.statusCode < 400) {
            return 'info';
        }
        // Always log successful requests at info level in development
        return process.env.NODE_ENV === 'development' ? 'info' : 'debug';
    },

    // Custom success message - clean format for development
    customSuccessMessage: function (req, res) {
        const responseTime = res.getHeader('X-Response-Time') || 'N/A';

        // For development, show clean format
        if (process.env.NODE_ENV === 'development') {
            const hasBody = req.method !== 'GET' && req.method !== 'HEAD' &&
                req.headers['content-length'] && parseInt(req.headers['content-length']) > 0;

            let message = `${req.method} ${(req as any).originalUrl || req.url} → ${res.statusCode} (${responseTime})`;

            // Add body content if there's a request body
            if (hasBody && (req as any).body) {
                const body = (req as any).body;
                let bodyDisplay = '';

                try {
                    // Sanitize sensitive fields before display
                    const sanitizedBody = sanitizeBody(body);

                    if (typeof sanitizedBody === 'object') {
                        bodyDisplay = JSON.stringify(sanitizedBody, null, 2);
                    } else {
                        bodyDisplay = String(sanitizedBody);
                    }

                    // Truncate very long bodies
                    if (bodyDisplay.length > 500) {
                        bodyDisplay = bodyDisplay.substring(0, 500) + '... (truncated)';
                    }

                    message += `\n${bodyDisplay}`;
                } catch (e) {
                    message += `\nRequest body: ${req.headers['content-length']} bytes (unable to parse)`;
                }
            }

            return message;
        }

        // For production, use standard format
        return `${req.method} ${(req as any).originalUrl || req.url} → ${res.statusCode} (${responseTime})`;
    },

    // Custom error message
    customErrorMessage: function (req, res, err) {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
});

// Create child loggers for different parts of the application
export const createChildLogger = (component: string, metadata: Record<string, any> = {}) => {
    return logger.child({ component, ...metadata });
};

export { logger, httpLogger };
export default logger; 