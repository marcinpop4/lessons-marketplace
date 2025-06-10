import { z } from 'zod';

/**
 * DevOps Schemas for Structured Logging and Monitoring
 * 
 * This file contains versioned Zod schemas for DevOps-related structured data.
 * These schemas ensure type safety and data validation for monitoring,
 * logging, and performance tracking systems.
 * 
 * Schema Evolution Strategy:
 * - MAJOR: Breaking changes (field removal, type changes, restructuring)
 * - MINOR: Additive changes (new optional fields, expanded enums)
 * - PATCH: Non-functional changes (better validation, documentation)
 */

// =============================================================================
// VERSION METADATA
// =============================================================================

export const SchemaVersions = {
    CURRENT: '1.0.0',
    SUPPORTED: ['1.0.0'],
    DEPRECATED: [],
} as const;

export type SchemaVersion = typeof SchemaVersions.SUPPORTED[number];

// =============================================================================
// V1.0.0 - INITIAL VALIDATION TIMING SCHEMA
// =============================================================================

/**
 * V1.0.0 - Initial schema for validation timing data
 * 
 * Validates structured logs sent to Grafana/Loki for performance
 * monitoring and trend analysis of CI/CD pipeline execution times.
 * 
 * @version 1.0.0
 * @since 2024-06-02
 */
export const ValidationTimingSchemaV1_0_0 = z.object({
    /** Schema version for compatibility tracking */
    schemaVersion: z.literal('1.0.0').default('1.0.0'),

    /** Service identifier - always 'lessons-marketplace' */
    service: z.literal('lessons-marketplace'),

    /** Component type for log categorization */
    component: z.literal('devops-logs'),

    /** Environment where validation was executed */
    environment: z.enum(['DEVELOPMENT', 'TEST', 'PRODUCTION']),

    /** Execution mode - fast skips Docker rebuilds */
    mode: z.enum(['fast', 'full']),

    /** Overall success/failure status */
    success: z.boolean(),

    /** Total pipeline execution time in milliseconds */
    totalExecutionTimeMs: z.number().min(0),

    /** Total setup phase time in milliseconds */
    totalSetupTimeMs: z.number().min(0),

    /** Total test execution time in milliseconds */
    totalTestTimeMs: z.number().min(0),

    /** Total number of tests executed */
    totalTestCount: z.number().int().min(0),

    /** Human-readable failure reason (empty string if successful) */
    failureReason: z.string(),

    /** Pipeline stage where failure occurred */
    failureStage: z.string(),

    /** Individual setup step timings (null if step was skipped) */
    setupSteps: z.object({
        cleanDockerMs: z.number().min(0).nullable(),
        buildImagesMs: z.number().min(0).nullable(),
        startServicesMs: z.number().min(0).nullable(),
        installDepsMs: z.number().min(0).nullable(),
        generatePrismaMs: z.number().min(0).nullable(),
        setupDatabaseMs: z.number().min(0).nullable(),
        diagnoseTypescriptMs: z.number().min(0).nullable(),
    }),

    /** Individual test suite timings (null if suite was skipped) */
    testSuites: z.object({
        unitTestsMs: z.number().min(0).nullable(),
        apiTestsMs: z.number().min(0).nullable(),
        e2eTestsMs: z.number().min(0).nullable(),
        logsTestsMs: z.number().min(0).nullable(),
    }),

    /** Individual test suite counts (null if suite was skipped) */
    testCounts: z.object({
        unitTestCount: z.number().int().min(0).nullable(),
        apiTestCount: z.number().int().min(0).nullable(),
        e2eTestCount: z.number().int().min(0).nullable(),
        logsTestCount: z.number().int().min(0).nullable(),
    }),

    /** Calculated performance metrics */
    performance: z.object({
        setupTimeSeconds: z.number().min(0),
        testTimeSeconds: z.number().min(0),
        totalTimeSeconds: z.number().min(0),
        setupPercentage: z.number().min(0).max(100),
        testPercentage: z.number().min(0).max(100),
    })
});

// =============================================================================
// SCHEMA REGISTRY
// =============================================================================

/**
 * Schema registry mapping versions to their respective schemas
 */
export const ValidationTimingSchemaRegistry = {
    '1.0.0': ValidationTimingSchemaV1_0_0,
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * TypeScript types inferred from current schema version
 */
export type ValidationTimingV1_0_0 = z.infer<typeof ValidationTimingSchemaV1_0_0>;

/**
 * Current version type alias (points to latest)
 */
export type ValidationTiming = ValidationTimingV1_0_0;

/**
 * Union type of all supported validation timing types
 */
export type AnyValidationTiming = ValidationTimingV1_0_0; // Will expand as versions are added

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates data against the current schema version
 */
export function validateValidationTiming(data: unknown): ValidationTiming {
    const currentSchema = ValidationTimingSchemaRegistry[SchemaVersions.CURRENT];

    try {
        return currentSchema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedError = error.errors.map(err =>
                `${err.path.join('.')}: ${err.message}`
            ).join(', ');
            throw new Error(`Validation timing data validation failed (v${SchemaVersions.CURRENT}): ${formattedError}`);
        }
        throw error;
    }
}

/**
 * Safe validation that returns a result object instead of throwing
 */
export function safeValidateValidationTiming(data: unknown): {
    success: true;
    data: ValidationTiming;
    version: SchemaVersion;
} | {
    success: false;
    error: string;
    version?: undefined;
} {
    const currentSchema = ValidationTimingSchemaRegistry[SchemaVersions.CURRENT];
    const result = currentSchema.safeParse(data);

    if (result.success) {
        return {
            success: true,
            data: result.data,
            version: SchemaVersions.CURRENT
        };
    } else {
        const formattedError = result.error.errors.map(err =>
            `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        return {
            success: false,
            error: `Validation failed (v${SchemaVersions.CURRENT}): ${formattedError}`
        };
    }
}

/**
 * Multi-version validation with fallback support
 * Tries all supported versions from newest to oldest
 */
export function validateWithFallback(data: unknown): {
    success: true;
    data: AnyValidationTiming;
    version: SchemaVersion;
} | {
    success: false;
    errors: Record<SchemaVersion, string>;
} {
    // Sort versions from newest to oldest
    const versions = [...SchemaVersions.SUPPORTED].sort().reverse() as SchemaVersion[];
    const errors: Record<string, string> = {};

    for (const version of versions) {
        const schema = ValidationTimingSchemaRegistry[version];
        const result = schema.safeParse(data);

        if (result.success) {
            return {
                success: true,
                data: result.data,
                version
            };
        } else {
            errors[version] = result.error.errors.map(err =>
                `${err.path.join('.')}: ${err.message}`
            ).join(', ');
        }
    }

    return {
        success: false,
        errors: errors as Record<SchemaVersion, string>
    };
}

/**
 * Validates data against a specific schema version
 */
export function validateSpecificVersion<V extends SchemaVersion>(
    data: unknown,
    version: V
): z.infer<typeof ValidationTimingSchemaRegistry[V]> {
    const schema = ValidationTimingSchemaRegistry[version];

    if (!schema) {
        throw new Error(`Unsupported schema version: ${version}`);
    }

    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const formattedError = error.errors.map(err =>
                `${err.path.join('.')}: ${err.message}`
            ).join(', ');
            throw new Error(`Validation failed (v${version}): ${formattedError}`);
        }
        throw error;
    }
}

// =============================================================================
// MIGRATION HELPERS (FOR FUTURE USE)
// =============================================================================

/**
 * Migration function registry (will be populated as new versions are added)
 * 
 * Example structure for future migrations:
 * {
 *   '1.0.0->1.1.0': (data: ValidationTimingV1_0_0) => ValidationTimingV1_1_0,
 *   '1.1.0->2.0.0': (data: ValidationTimingV1_1_0) => ValidationTimingV2_0_0,
 * }
 */
export const MigrationRegistry = {
    // Future migrations will be added here
} as const;

/**
 * Utility to get schema information
 */
export function getSchemaInfo() {
    return {
        current: SchemaVersions.CURRENT,
        supported: SchemaVersions.SUPPORTED,
        deprecated: SchemaVersions.DEPRECATED,
        availableSchemas: Object.keys(ValidationTimingSchemaRegistry),
    };
}

// =============================================================================
// SCHEMA METADATA
// =============================================================================

export const DevOpsSchemaMetadata = {
    version: SchemaVersions.CURRENT,
    compatibleWith: SchemaVersions.SUPPORTED,
    lastUpdated: '2024-06-02',
    description: 'DevOps monitoring schemas with version support',
    changelog: {
        '1.0.0': {
            date: '2024-06-02',
            changes: ['Initial schema for validation timing data'],
            breaking: false,
        },
        // Future versions will be documented here
    },
} as const; 