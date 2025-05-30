import pino from 'pino';

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

// Determine if we're in a Node.js environment
const isNodeEnvironment = typeof process !== 'undefined' && process.versions && process.versions.node;

// Get environment variables (works in both Node and browser with bundler)
const getEnvVar = (name: string, defaultValue?: string): string | undefined => {
    if (isNodeEnvironment) {
        return process.env[name] || defaultValue;
    }
    // In browser/frontend, environment variables are typically injected at build time
    // This would be handled by Vite or other bundlers
    return defaultValue;
};

// Create the base logger
const logger = pino({
    level: getLogLevel(getEnvVar('LOG_LEVEL')),
    base: {
        service: 'lessons-marketplace',
        environment: getEnvVar('NODE_ENV', 'development'),
    },
    timestamp: pino.stdTimeFunctions.isoTime,

    // Use multiple transports - pretty for terminal, files for aggregation
    transport: getEnvVar('NODE_ENV') === 'development' && getEnvVar('SHOW_TEST_LOGS') !== 'false' ? {
        targets: [
            // Pretty terminal output
            {
                target: 'pino-pretty',
                level: 'debug',
                options: {
                    colorize: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname,service,environment',
                    singleLine: false,
                    hideObject: false,
                    messageFormat: '{component} | {msg}',
                }
            },
            // Structured JSON logs to file for aggregation
            {
                target: 'pino/file',
                level: 'debug',
                options: {
                    destination: './logs/app.log',
                    mkdir: true
                }
            }
        ]
    } : getEnvVar('NODE_ENV') === 'test' || getEnvVar('SHOW_TEST_LOGS') === 'false' ? {
        // During test runs or when explicitly disabled, suppress output
        target: 'pino/file',
        options: {
            destination: (isNodeEnvironment && process.platform === 'win32') ? 'NUL' : '/dev/null'
        }
    } : {
        // Production: only file output
        target: 'pino/file',
        options: {
            destination: './logs/app.log',
            mkdir: true
        }
    },

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

// Create child loggers for different parts of the application
export const createChildLogger = (component: string, metadata: Record<string, any> = {}) => {
    return logger.child({ component, ...metadata });
};

export { logger };
export default logger; 