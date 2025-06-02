import { z } from 'zod';

/**
 * Client Logs Schema Versioning
 * 
 * This module provides versioned schemas for client-side logging data validation.
 * Supports structured logging for frontend interactions, errors, and performance metrics.
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

const LogLevelSchema = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL']);
const ClientEventTypeSchema = z.enum([
    'PAGE_LOAD',
    'USER_INTERACTION',
    'API_CALL',
    'ERROR',
    'PERFORMANCE',
    'NAVIGATION'
]);

const ClientContextSchema = z.object({
    sessionId: z.string().min(1),
    userId: z.string().nullable(),
    userAgent: z.string().min(1),
    url: z.string().url(),
    referrer: z.string().nullable(),
    viewportWidth: z.number().int().min(0),
    viewportHeight: z.number().int().min(0),
    timestamp: z.string().datetime(),
});

const PerformanceMetricsSchema = z.object({
    loadTime: z.number().min(0).nullable(),
    renderTime: z.number().min(0).nullable(),
    domContentLoaded: z.number().min(0).nullable(),
    firstContentfulPaint: z.number().min(0).nullable(),
    largestContentfulPaint: z.number().min(0).nullable(),
    cumulativeLayoutShift: z.number().min(0).nullable(),
    firstInputDelay: z.number().min(0).nullable(),
});

const ApiCallDetailsSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']),
    url: z.string().url(),
    statusCode: z.number().int().min(100).max(599).nullable(),
    responseTime: z.number().min(0).nullable(),
    errorMessage: z.string().nullable(),
    requestSize: z.number().int().min(0).nullable(),
    responseSize: z.number().int().min(0).nullable(),
});

const UserInteractionSchema = z.object({
    elementType: z.string().min(1).nullable(),
    elementId: z.string().nullable(),
    elementClass: z.string().nullable(),
    interactionType: z.enum(['click', 'scroll', 'input', 'hover', 'focus', 'submit']),
    coordinates: z.object({
        x: z.number().int().min(0),
        y: z.number().int().min(0)
    }).nullable(),
});

const ErrorDetailsSchema = z.object({
    name: z.string().min(1),
    message: z.string().min(1),
    stack: z.string().nullable(),
    filename: z.string().nullable(),
    lineno: z.number().int().min(0).nullable(),
    colno: z.number().int().min(0).nullable(),
    componentStack: z.string().nullable(),
});

export const ClientLogV1_0_0Schema = z.object({
    schemaVersion: z.literal('1.0.0'),
    service: z.literal('lessons-marketplace'),
    component: z.literal('client-logs'),
    environment: z.enum(['DEVELOPMENT', 'TEST', 'PRODUCTION']),
    logLevel: LogLevelSchema,
    eventType: ClientEventTypeSchema,
    message: z.string().min(1),
    context: ClientContextSchema,
    performanceMetrics: PerformanceMetricsSchema.nullable(),
    apiCall: ApiCallDetailsSchema.nullable(),
    userInteraction: UserInteractionSchema.nullable(),
    error: ErrorDetailsSchema.nullable(),
    customData: z.record(z.string(), z.unknown()).nullable(),
    timestamp: z.string().datetime(),
});

export type ClientLogV1_0_0 = z.infer<typeof ClientLogV1_0_0Schema>;

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

const SchemaRegistry = {
    '1.0.0': ClientLogV1_0_0Schema,
} as const;

export type ClientLog = ClientLogV1_0_0;

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates client log data against the current schema version
 */
export function validateClientLog(data: unknown): ClientLog {
    try {
        return ClientLogV1_0_0Schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.errors
                .map(err => `${err.path.join('.')}: ${err.message}`)
                .join(', ');
            throw new Error(`Client log data validation failed (v${SchemaVersions.CURRENT}): ${errorMessage}`);
        }
        throw error;
    }
}

/**
 * Safely validates client log data, returning success/failure result
 */
export function safeValidateClientLog(data: unknown):
    | { success: true; data: ClientLog; version: string }
    | { success: false; error: string; version?: undefined } {

    try {
        const validatedData = validateClientLog(data);
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
    | { success: true; data: ClientLog; version: string }
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
export function validateSpecificVersion(data: unknown, version: SupportedVersion): ClientLog {
    const schema = SchemaRegistry[version];
    if (!schema) {
        throw new Error(`Unsupported schema version: ${version}`);
    }

    try {
        return schema.parse(data) as ClientLog;
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

export const ClientLogsSchemaMetadata = {
    version: SchemaVersions.CURRENT,
    description: 'Client-side logging schemas for frontend interactions, errors, and performance monitoring',
    maintainer: 'DevOps Team',
    changelog: {
        '1.0.0': {
            date: '2024-06-02',
            changes: [
                'Initial schema version for client-side logging',
                'Support for page load tracking, user interactions, API calls',
                'Performance metrics integration',
                'Error tracking with stack traces',
                'Structured context information'
            ],
            breaking: false
        }
    }
} as const; 