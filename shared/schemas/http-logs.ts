import { z } from 'zod';

/**
 * HTTP Logs Schema Versioning
 * 
 * This module provides versioned schemas for HTTP request/response logging data validation.
 * Supports structured logging for API calls, middleware operations, and request tracing.
 */

// =============================================================================
// VERSION METADATA
// =============================================================================

export const SchemaVersions = {
    CURRENT: '1.0.0',
    SUPPORTED: ['1.0.0'],
    DEPRECATED: []
} as const;

export type SupportedVersion = typeof SchemaVersions.SUPPORTED[number];

// =============================================================================
// VERSION 1.0.0 SCHEMAS
// =============================================================================

const HttpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);
const LogLevelSchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);

const RequestHeadersSchema = z.record(z.string(), z.string()).nullable();
const ResponseHeadersSchema = z.record(z.string(), z.string()).nullable();

const RequestDetailsSchema = z.object({
    method: HttpMethodSchema,
    url: z.string().url(),
    path: z.string().min(1),
    query: z.record(z.string(), z.unknown()).nullable(),
    headers: RequestHeadersSchema,
    body: z.string().nullable(), // Serialized as string for logging
    contentLength: z.number().int().min(0).nullable(),
    userAgent: z.string().nullable(),
    clientIp: z.string().ip().nullable(),
    correlationId: z.string().uuid().nullable(),
});

const ResponseDetailsSchema = z.object({
    statusCode: z.number().int().min(100).max(599),
    statusMessage: z.string().nullable(),
    headers: ResponseHeadersSchema,
    body: z.string().nullable(), // Serialized as string for logging
    contentLength: z.number().int().min(0).nullable(),
    contentType: z.string().nullable(),
});

const TimingDetailsSchema = z.object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    duration: z.number().min(0), // in milliseconds
    dnsLookup: z.number().min(0).nullable(),
    tcpConnection: z.number().min(0).nullable(),
    tlsHandshake: z.number().min(0).nullable(),
    timeToFirstByte: z.number().min(0).nullable(),
    contentTransfer: z.number().min(0).nullable(),
});

const ErrorDetailsSchema = z.object({
    name: z.string().min(1),
    message: z.string().min(1),
    stack: z.string().nullable(),
    code: z.string().nullable(),
    isOperational: z.boolean().nullable(),
});

const SecurityInfoSchema = z.object({
    isHttps: z.boolean(),
    tlsVersion: z.string().nullable(),
    cipher: z.string().nullable(),
    authMethod: z.enum(['none', 'basic', 'bearer', 'session', 'oauth', 'custom']).nullable(),
    userId: z.string().nullable(),
    rateLimited: z.boolean().nullable(),
    blocked: z.boolean().nullable(),
});

const PerformanceMetricsSchema = z.object({
    memoryUsage: z.number().min(0).nullable(), // in bytes
    cpuUsage: z.number().min(0).max(100).nullable(), // percentage
    requestsPerSecond: z.number().min(0).nullable(),
    concurrentRequests: z.number().int().min(0).nullable(),
    queueTime: z.number().min(0).nullable(), // time spent in queue
});

export const HttpLogV1_0_0Schema = z.object({
    schemaVersion: z.literal('1.0.0'),
    service: z.literal('lessons-marketplace'),
    component: z.literal('http-logs'),
    environment: z.enum(['DEVELOPMENT', 'TEST', 'PRODUCTION']),
    logLevel: LogLevelSchema,
    message: z.string().min(1),
    request: RequestDetailsSchema,
    response: ResponseDetailsSchema.nullable(),
    timing: TimingDetailsSchema,
    error: ErrorDetailsSchema.nullable(),
    security: SecurityInfoSchema.nullable(),
    performance: PerformanceMetricsSchema.nullable(),
    middleware: z.array(z.string()).nullable(), // Names of middleware that processed the request
    route: z.string().nullable(), // Express route pattern
    handler: z.string().nullable(), // Controller/handler function name
    customData: z.record(z.string(), z.unknown()).nullable(),
    timestamp: z.string().datetime(),
});

export type HttpLogV1_0_0 = z.infer<typeof HttpLogV1_0_0Schema>;

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

const SchemaRegistry = {
    '1.0.0': HttpLogV1_0_0Schema,
} as const;

export type HttpLog = HttpLogV1_0_0;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates HTTP log data against the current schema version
 */
export function validateHttpLog(data: unknown): HttpLog {
    try {
        return HttpLogV1_0_0Schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join(', ');
            throw new Error(`HTTP log data validation failed (v${SchemaVersions.CURRENT}): ${errorMessage}`);
        }
        throw error;
    }
}

/**
 * Safely validates HTTP log data, returning success/failure result
 */
export function safeValidateHttpLog(data: unknown):
    | { success: true; data: HttpLog; version: string }
    | { success: false; error: string; version?: undefined } {

    try {
        const validatedData = validateHttpLog(data);
        return {
            success: true,
            data: validatedData,
            version: SchemaVersions.CURRENT
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown validation error'
        };
    }
}

/**
 * Validates against multiple schema versions as fallback
 */
export function validateWithFallback(data: unknown):
    | { success: true; data: HttpLog; version: string }
    | { success: false; errors: Record<string, string> } {

    const errors: Record<string, string> = {};

    // Try each supported version
    for (const version of SchemaVersions.SUPPORTED) {
        try {
            const validatedData = validateSpecificVersion(data, version);
            return {
                success: true,
                data: validatedData,
                version
            };
        } catch (error) {
            errors[version] = error instanceof Error ? error.message : 'Unknown error';
        }
    }

    return { success: false, errors };
}

/**
 * Validates against a specific schema version
 */
export function validateSpecificVersion(data: unknown, version: SupportedVersion): HttpLog {
    const schema = SchemaRegistry[version];
    if (!schema) {
        throw new Error(`Unsupported schema version: ${version}`);
    }

    try {
        return schema.parse(data) as HttpLog;
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join(', ');
            throw new Error(`Validation failed (v${version}): ${errorMessage}`);
        }
        throw error;
    }
}

/**
 * Returns schema information and metadata
 */
export function getSchemaInfo() {
    return {
        current: SchemaVersions.CURRENT,
        supported: SchemaVersions.SUPPORTED,
        deprecated: SchemaVersions.DEPRECATED,
        availableSchemas: Object.keys(SchemaRegistry)
    };
}

// =============================================================================
// SCHEMA METADATA AND CHANGELOG
// =============================================================================

export const HttpLogsSchemaMetadata = {
    version: SchemaVersions.CURRENT,
    description: 'HTTP request/response logging schemas for API monitoring, performance tracking, and security auditing',
    maintainer: 'DevOps Team',
    changelog: {
        '1.0.0': {
            date: '2024-06-02',
            changes: [
                'Initial schema version for HTTP request/response logging',
                'Support for request/response details, timing metrics',
                'Security information tracking (TLS, auth, rate limiting)',
                'Performance metrics integration',
                'Error tracking with operational flags',
                'Middleware and routing information'
            ],
            breaking: false
        }
    }
} as const; 