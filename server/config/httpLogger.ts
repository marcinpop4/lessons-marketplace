import pinoHttp from 'pino-http';
import { logger } from '../../config/logger.js';

// Helper function to get environment variables
const getEnvVar = (name: string): string | undefined => {
    return process.env[name];
};

// Create HTTP logger (replaces Morgan) - Node.js only
export const httpLogger = pinoHttp({
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
        if (originalUrl?.includes('/api/v1/logs') && getEnvVar('LOG_LEVEL') !== 'debug' && !getEnvVar('DEBUG')) {
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
        return getEnvVar('NODE_ENV') === 'development' ? 'info' : 'debug';
    },
}); 