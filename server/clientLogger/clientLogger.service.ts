import { createChildLogger } from '../../config/logger';
import { BadRequestError } from '../errors/index';
import pino from 'pino';
import { validateClientLog, ClientLogV1_0_0 } from '../../shared/schemas/client-logs-schema-v1';

/**
 * Redaction marker used consistently across all logging systems
 */
const REDACTION_MARKER = '[Redacted]';

// Map client log levels to lowercase pino levels
const LOG_LEVEL_MAP: Record<string, string> = {
    'ERROR': 'error',
    'WARN': 'warn',
    'INFO': 'info',
    'DEBUG': 'debug',
    'TRACE': 'trace',
    'FATAL': 'fatal'
};

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
    logs: any[]; // Change to any[] to accept raw logs before validation
    ip?: string;
    forwardedFor?: string;
}

interface ProcessLogsResult {
    success: boolean;
    processed: number;
}

class ClientLoggerService {
    private logger: pino.Logger;

    constructor(logger: pino.Logger) {
        this.logger = logger;
    }

    /**
     * Process client log entries with validation and enrichment.
     * @param request - The logs and metadata to process
     * @returns Result indicating success and number of processed logs
     * @throws BadRequestError for validation failures
     */
    async processLogs(request: ProcessLogsRequest): Promise<ProcessLogsResult> {
        const { logs, ip, forwardedFor } = request;

        // Basic structural validation
        if (!logs || !Array.isArray(logs)) {
            throw new BadRequestError('Invalid logs format: logs field must be an array.');
        }

        if (logs.length === 0) {
            throw new BadRequestError('Invalid logs format: logs array cannot be empty.');
        }

        if (logs.length > 100) {
            throw new BadRequestError('Too many log entries. Maximum 100 per request.');
        }

        const validLogs: ClientLogV1_0_0[] = [];
        const validationErrors: { log: any; error: string }[] = [];

        // Atomically validate all logs before processing any
        logs.forEach((rawLog: any) => {
            try {
                const validatedLog = validateClientLog(rawLog);
                validLogs.push(validatedLog);
            } catch (error: any) {
                const validationErrorMessage = error.message || 'Unknown validation error';
                validationErrors.push({ log: rawLog, error: validationErrorMessage });
            }
        });

        // Process all valid logs
        validLogs.forEach((log) => {
            this.processLogEntry(log, ip, forwardedFor);
        });

        // If there were any validation errors, log them for debugging.
        // This prevents a few bad logs from a client from stopping all log ingestion.
        if (validationErrors.length > 0) {
            this.logger.warn({
                message: 'Some client logs failed validation and were discarded.',
                component: 'client-logs-validation-error',
                totalReceived: logs.length,
                validCount: validLogs.length,
                invalidCount: validationErrors.length,
                // Log details of the first error to keep log size reasonable
                firstError: {
                    errorMessage: validationErrors[0].error,
                    logPayloadSnippet: JSON.stringify(validationErrors[0].log).substring(0, 500) + '...'
                }
            }, `Discarded ${validationErrors.length} invalid client logs`);

            // Only fail the entire request if ALL logs were invalid.
            if (validLogs.length === 0) {
                throw new BadRequestError(`All ${logs.length} client log entries failed validation. First error: ${validationErrors[0].error}`);
            }
        }

        return {
            success: true,
            processed: validLogs.length
        };
    }

    /**
     * Process a single log entry by enriching it with server-side metadata and logging it.
     * @param log - The VALIDATED client log entry to process
     * @param ip - Client IP address
     * @param forwardedFor - X-Forwarded-For header value
     */
    private processLogEntry(
        log: ClientLogV1_0_0,
        ip?: string,
        forwardedFor?: string
    ): void {
        // Extract key fields for Loki labels (directly from validated log structure)
        const pageGroup = log.customData?.pageGroup || 'unknown';
        const eventType = log.customData?.event_type || log.message.toLowerCase().replace(/\\s+/g, '_');

        // Create enriched log data for structured logging
        const enrichedLogData: Record<string, any> = {
            message: log.message,
            level: LOG_LEVEL_MAP[log.logLevel] || 'info', // Map to lowercase pino level

            pageGroup,
            event_type: eventType,

            clientTimestamp: log.context?.timestamp || log.timestamp,
            sessionId: log.context?.sessionId,
            userId: log.context?.userId,
            url: log.context?.url,
            viewport: log.context?.viewportWidth !== undefined && log.context?.viewportHeight !== undefined
                ? { width: log.context.viewportWidth, height: log.context.viewportHeight }
                : undefined,

            vitals: log.performanceMetrics,

            errorDetails: log.error,
            apiCallDetails: log.apiCall,
            userInteractionDetails: log.userInteraction,

            service: log.service,
            component: log.component,
            environment: log.environment,
            schemaVersion: log.schemaVersion,
            serverTimestamp: new Date().toISOString(),
            source: 'client',
            ip: ip,
            forwardedFor: forwardedFor,
            userAgent: log.context?.userAgent?.slice(0, 200),

            ...(log.customData || {}),
        };

        // Remove undefined fields to keep logs clean
        Object.keys(enrichedLogData).forEach(key => {
            if (enrichedLogData[key] === undefined) {
                delete enrichedLogData[key];
            }
        });

        // Log using standard logger
        this.logger.info(enrichedLogData, log.message);
    }
}

export const clientLoggerService = new ClientLoggerService(clientLogger); 