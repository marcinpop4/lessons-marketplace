import { createChildLogger } from '../../config/logger.js';
import { BadRequestError } from '../errors/index.js';
import pino from 'pino';

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

// Create comprehensive redaction configuration using Pino's built-in capabilities
const createRedactionConfig = (additionalPaths: string[] = []) => ({
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

        // Client/data specific paths
        'data.password',
        'data.token',
        'data.authorization',
        'data.cookie',
        'data.secret',
        'data.apikey',
        'data.apiKey',
        'data.accessToken',
        'data.refreshToken',

        // User object specific paths
        'user.password',
        'user.token',
        'user.authorization',
        'user.secret',
        'user.apikey',
        'user.apiKey',
        'user.accessToken',
        'user.refreshToken',

        // Additional custom paths
        ...additionalPaths
    ],
    censor: REDACTION_MARKER,
    remove: false
});

// Create client logger using Pino with structured output to stdout
const clientFileLogger = pino({
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
}); // No stream specified = outputs to stdout

// Create backup logger for fallback
const clientLogger = createChildLogger('client-logs');

interface ClientLogEntry {
    timestamp: string;
    level: string;
    message: string;
    data?: Record<string, any>;
    sessionId?: string;
    userId?: string;
    url?: string;
    userAgent?: string;
    viewport?: {
        width: number;
        height: number;
    };
}

interface ProcessLogsRequest {
    logs: ClientLogEntry[];
    ip?: string;
    forwardedFor?: string;
}

interface ProcessLogsResult {
    success: boolean;
    processed: number;
}

class ClientLoggerService {
    /**
     * Process client log entries with validation and enrichment.
     * @param request - The logs and metadata to process
     * @returns Result indicating success and number of processed logs
     * @throws BadRequestError for validation failures
     */
    async processLogs(request: ProcessLogsRequest): Promise<ProcessLogsResult> {
        const { logs, ip, forwardedFor } = request;

        // Validation
        if (!logs || !Array.isArray(logs)) {
            throw new BadRequestError('Invalid logs format');
        }

        if (logs.length === 0) {
            throw new BadRequestError('Invalid logs format');
        }

        if (logs.length > 100) {
            throw new BadRequestError('Too many log entries. Maximum 100 per request.');
        }

        // Process each log entry
        logs.forEach((log: ClientLogEntry) => {
            this.processLogEntry(log, ip, forwardedFor);
        });

        return {
            success: true,
            processed: logs.length
        };
    }

    /**
     * Process a single log entry by enriching it with server-side metadata and logging it.
     * @param log - The client log entry to process
     * @param ip - Client IP address
     * @param forwardedFor - X-Forwarded-For header value
     */
    private processLogEntry(log: ClientLogEntry, ip?: string, forwardedFor?: string): void {
        // Extract key fields for Loki labels
        const pageGroup = log.data?.pageGroup || 'unknown';
        const eventType = log.data?.event || log.message.toLowerCase().replace(/\s+/g, '_');

        // Create enriched log data for structured logging
        const enrichedLogData = {
            ...log.data,
            pageGroup,
            event_type: eventType,
            clientTimestamp: log.timestamp,
            sessionId: log.sessionId,
            userId: log.userId,
            url: log.url,
            viewport: log.viewport,
            serverTimestamp: new Date().toISOString(),
            source: 'client',
            ip: ip,
            forwardedFor: forwardedFor,
            userAgent: log.userAgent?.slice(0, 200),
        };

        // Use Pino logger for structured output (outputs to stdout for Promtail)
        switch (log.level) {
            case 'error':
                clientFileLogger.error(enrichedLogData, log.message);
                break;
            case 'warn':
                clientFileLogger.warn(enrichedLogData, log.message);
                break;
            case 'debug':
                clientFileLogger.debug(enrichedLogData, log.message);
                break;
            default:
                clientFileLogger.info(enrichedLogData, log.message);
        }

        // Also log using standard logger for backup
        switch (log.level) {
            case 'error':
                clientLogger.error(enrichedLogData, log.message);
                break;
            case 'warn':
                clientLogger.warn(enrichedLogData, log.message);
                break;
            case 'debug':
                clientLogger.debug(enrichedLogData, log.message);
                break;
            default:
                clientLogger.info(enrichedLogData, log.message);
        }
    }
}

export const clientLoggerService = new ClientLoggerService(); 