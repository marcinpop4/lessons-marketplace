import { createChildLogger } from '../../config/logger.js';
import { BadRequestError } from '../errors/index.js';

// Create client logger that logs at debug level in development to hide from console
const clientLogger = createChildLogger('client');

// Dynamically import file logging when available
let clientFileLogger: any = null;
if (typeof process !== 'undefined' && process.versions?.node) {
    // Import file logger asynchronously
    import('../config/fileLogger.js').then(fileLoggerModule => {
        clientFileLogger = fileLoggerModule.clientFileLogger;
    }).catch(error => {
        console.warn('Client file logging not available:', error);
    });
}

// Override log methods to hide from terminal but write to files
const createClientLogMethod = (originalLevel: string) => {
    return (obj: any, msg?: string) => {
        // Always write to file at the proper level (if available)
        if (clientFileLogger) {
            (clientFileLogger as any)[originalLevel](obj, msg);
        }

        // In development, don't log to terminal (hidden)
        // In production, also log to main logger
        if (process.env.NODE_ENV !== 'development') {
            (clientLogger as any)[originalLevel](obj, msg);
        }
    };
};

// Create methods that hide client logs from development console
const clientLogMethods = {
    error: createClientLogMethod('error'),
    warn: createClientLogMethod('warn'),
    info: createClientLogMethod('info'),
    debug: clientLogger.debug.bind(clientLogger)
};

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

        // Add server-side metadata (excluding fields that will become labels)
        const { pageGroup: _pg, event: _ev, ...dataWithoutLabels } = log.data || {};
        const enrichedLog = {
            ...dataWithoutLabels,
            clientTimestamp: log.timestamp,
            sessionId: log.sessionId,
            userId: log.userId,
            url: log.url,
            viewport: log.viewport,
            serverTimestamp: new Date().toISOString(),
            source: 'client',
            ip: ip,
            forwardedFor: forwardedFor,
            userAgent: log.userAgent?.slice(0, 200), // Truncate long user agents
        };

        // Create child logger with labels for efficient querying
        const labeledLogger = clientFileLogger?.child({
            pageGroup,
            event_type: eventType
        });

        // Log based on level using structured logging
        switch (log.level) {
            case 'error':
                if (labeledLogger) {
                    labeledLogger.error(enrichedLog, log.message);
                } else {
                    clientLogMethods.error(enrichedLog, log.message);
                }
                break;
            case 'warn':
                if (labeledLogger) {
                    labeledLogger.warn(enrichedLog, log.message);
                } else {
                    clientLogMethods.warn(enrichedLog, log.message);
                }
                break;
            case 'debug':
                if (labeledLogger) {
                    labeledLogger.debug(enrichedLog, log.message);
                } else {
                    clientLogMethods.debug(enrichedLog, log.message);
                }
                break;
            default:
                if (labeledLogger) {
                    labeledLogger.info(enrichedLog, log.message);
                } else {
                    clientLogMethods.info(enrichedLog, log.message);
                }
        }
    }
}

export const clientLoggerService = new ClientLoggerService(); 