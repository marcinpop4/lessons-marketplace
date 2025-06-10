import { describe, it, expect } from '@jest/globals';
import {
    safeValidateValidationTiming,
    validateValidationTiming,
    validateWithFallback,
    validateSpecificVersion,
    getSchemaInfo,
    type ValidationTiming,
    type ValidationTimingV1_0_0,
    SchemaVersions,
    DevOpsSchemaMetadata
} from '../../../../shared/schemas/devops-schema-v1';

/**
 * Test suite for DevOps schema validation functions
 */
describe('DevOps Schema Validation', () => {

    // Helper function to create valid test data
    const createValidData = (overrides: Partial<ValidationTiming> = {}): ValidationTiming => ({
        schemaVersion: '1.0.0',
        service: 'lessons-marketplace',
        component: 'devops-logs',
        environment: 'TEST',
        mode: 'fast',
        success: true,
        totalExecutionTimeMs: 300000,
        totalSetupTimeMs: 60000,
        totalTestTimeMs: 240000,
        totalTestCount: 150,
        failureReason: '',
        failureStage: '',
        setupSteps: {
            cleanDockerMs: null,
            buildImagesMs: null,
            startServicesMs: 26601,
            installDepsMs: 4190,
            generatePrismaMs: 1198,
            setupDatabaseMs: 8703,
            diagnoseTypescriptMs: 5739,
        },
        testSuites: {
            unitTestsMs: 100000,
            apiTestsMs: 120000,
            e2eTestsMs: 20000,
            logsTestsMs: 15000,
        },
        testCounts: {
            unitTestCount: 80,
            apiTestCount: 50,
            e2eTestCount: 15,
            logsTestCount: 5,
        },
        performance: {
            setupTimeSeconds: 60,
            testTimeSeconds: 240,
            totalTimeSeconds: 300,
            setupPercentage: 36.8,
            testPercentage: 63.2,
        },
        ...overrides
    });

    describe('validateValidationTiming()', () => {
        it('should validate correct data successfully', () => {
            const validData = createValidData();

            const result = validateValidationTiming(validData);

            expect(result).toEqual(validData);
            expect(result.schemaVersion).toBe('1.0.0');
            expect(result.service).toBe('lessons-marketplace');
            expect(result.success).toBe(true);
        });

        it('should validate data with failure scenario', () => {
            const failedData = createValidData({
                success: false,
                failureReason: 'Test suite failed',
                failureStage: 'testing',
                testSuites: {
                    ...createValidData().testSuites,
                    apiTestsMs: null,
                    logsTestsMs: 0,
                },
                testCounts: {
                    ...createValidData().testCounts,
                    apiTestCount: 0,
                }
            });

            const result = validateValidationTiming(failedData);
            expect(result.success).toBe(false);
            expect(result.failureReason).toBe('Test suite failed');
        });

        it('should validate different environments', () => {
            const environments: Array<'DEVELOPMENT' | 'TEST' | 'PRODUCTION'> = ['DEVELOPMENT', 'TEST', 'PRODUCTION'];

            environments.forEach(env => {
                const data = createValidData({ environment: env });
                const result = validateValidationTiming(data);
                expect(result.environment).toBe(env);
            });
        });

        it('should validate different modes', () => {
            const modes: Array<'fast' | 'full'> = ['fast', 'full'];

            modes.forEach(mode => {
                const data = createValidData({ mode });
                const result = validateValidationTiming(data);
                expect(result.mode).toBe(mode);
            });
        });

        it('should throw error for missing required fields', () => {
            const invalidData = {
                schemaVersion: '1.0.0',
                service: 'lessons-marketplace',
                component: 'devops-logs',
                // Missing required fields
            };

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/Validation timing data validation failed \(v1\.0\.0\)/);
        });

        it('should throw error for invalid service name', () => {
            const invalidData = createValidData({
                service: 'wrong-service' as any
            });

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/service.*Invalid literal value/);
        });

        it('should throw error for invalid component', () => {
            const invalidData = createValidData({
                component: 'wrong-component' as any
            });

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/component.*Invalid literal value/);
        });

        it('should throw error for invalid environment', () => {
            const invalidData = createValidData({
                environment: 'INVALID' as any
            });

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/environment.*Invalid enum value/);
        });

        it('should throw error for negative timing values', () => {
            const invalidData = createValidData({
                totalExecutionTimeMs: -100
            });

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/totalExecutionTimeMs.*Number must be greater than or equal to 0/);
        });

        it('should throw error for invalid percentage values', () => {
            const invalidData = createValidData({
                performance: {
                    setupTimeSeconds: 46.43,
                    testTimeSeconds: 79.73,
                    totalTimeSeconds: 126.16,
                    setupPercentage: 150, // Invalid: > 100
                    testPercentage: 63.2,
                }
            });

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/setupPercentage.*Number must be less than or equal to 100/);
        });

        it('should throw error for wrong data types', () => {
            const invalidData = createValidData({
                success: 'true' as any // Should be boolean
            });

            expect(() => {
                validateValidationTiming(invalidData);
            }).toThrow(/success.*Expected boolean/);
        });
    });

    describe('safeValidateValidationTiming()', () => {
        it('should return success result for valid data', () => {
            const validData = createValidData();

            const result = safeValidateValidationTiming(validData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validData);
                expect(result.version).toBe('1.0.0');
            }
        });

        it('should return failure result for invalid data', () => {
            const invalidData = {
                schemaVersion: '1.0.0',
                service: 'wrong-service',
                // Missing other required fields
            };

            const result = safeValidateValidationTiming(invalidData);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Validation failed (v1.0.0)');
                expect(result.error).toContain('service');
                expect(result.version).toBeUndefined();
            }
        });

        it('should return detailed error messages for multiple validation errors', () => {
            const invalidData = {
                schemaVersion: '1.0.0',
                service: 'wrong-service',
                component: 'wrong-component',
                environment: 'INVALID',
                mode: 'invalid-mode',
                // Missing other fields will also cause errors
            };

            const result = safeValidateValidationTiming(invalidData);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('service');
                expect(result.error).toContain('component');
                expect(result.error).toContain('environment');
            }
        });

        it('should handle null values correctly', () => {
            const dataWithNulls = createValidData({
                failureReason: '',
                failureStage: '',
                setupSteps: {
                    cleanDockerMs: null,
                    buildImagesMs: 120000,
                    startServicesMs: 30000,
                    installDepsMs: null,
                    generatePrismaMs: 5000,
                    setupDatabaseMs: 10000,
                    diagnoseTypescriptMs: null,
                },
                testSuites: {
                    unitTestsMs: 50000,
                    apiTestsMs: null,
                    e2eTestsMs: 25000,
                    logsTestsMs: null,
                },
                testCounts: {
                    unitTestCount: 50,
                    apiTestCount: null,
                    e2eTestCount: 10,
                    logsTestCount: null,
                }
            });

            const result = safeValidateValidationTiming(dataWithNulls);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.setupSteps.cleanDockerMs).toBeNull();
                expect(result.data.testSuites.apiTestsMs).toBeNull();
                expect(result.data.testSuites.logsTestsMs).toBeNull();
            }
        });
    });

    describe('validateWithFallback()', () => {
        it('should validate with current version successfully', () => {
            const validData = createValidData();

            const result = validateWithFallback(validData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toEqual(validData);
                expect(result.version).toBe('1.0.0');
            }
        });

        it('should return errors for all supported versions when data is invalid', () => {
            const invalidData = {
                invalid: 'data'
            };

            const result = validateWithFallback(invalidData);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(Object.keys(result.errors)).toContain('1.0.0');
                expect(result.errors['1.0.0']).toContain('service');
            }
        });
    });

    describe('validateSpecificVersion()', () => {
        it('should validate against specific version successfully', () => {
            const validData = createValidData();

            const result = validateSpecificVersion(validData, '1.0.0');

            expect(result).toEqual(validData);
        });

        it('should throw error for unsupported version', () => {
            const validData = createValidData();

            expect(() => {
                validateSpecificVersion(validData, '2.0.0' as any);
            }).toThrow('Unsupported schema version: 2.0.0');
        });

        it('should throw error for invalid data with version context', () => {
            const invalidData = { invalid: 'data' };

            expect(() => {
                validateSpecificVersion(invalidData, '1.0.0');
            }).toThrow(/Validation failed \(v1\.0\.0\)/);
        });
    });

    describe('Schema Information Functions', () => {
        it('should return correct schema information', () => {
            const info = getSchemaInfo();

            expect(info.current).toBe('1.0.0');
            expect(info.supported).toEqual(['1.0.0']);
            expect(info.deprecated).toEqual([]);
            expect(info.availableSchemas).toEqual(['1.0.0']);
        });

        it('should have correct schema versions constants', () => {
            expect(SchemaVersions.CURRENT).toBe('1.0.0');
            expect(SchemaVersions.SUPPORTED).toEqual(['1.0.0']);
            expect(SchemaVersions.DEPRECATED).toEqual([]);
        });

        it('should have correct metadata', () => {
            expect(DevOpsSchemaMetadata.version).toBe('1.0.0');
            expect(DevOpsSchemaMetadata.description).toContain('DevOps monitoring schemas');
            expect(DevOpsSchemaMetadata.changelog['1.0.0']).toBeDefined();
            expect(DevOpsSchemaMetadata.changelog['1.0.0'].breaking).toBe(false);
        });
    });

    describe('Edge Cases and Boundary Values', () => {
        it('should validate with zero timing values', () => {
            const zeroData = createValidData({
                totalExecutionTimeMs: 0,
                totalSetupTimeMs: 0,
                totalTestTimeMs: 0,
                totalTestCount: 0,
                setupSteps: {
                    cleanDockerMs: 0,
                    buildImagesMs: 0,
                    startServicesMs: 0,
                    installDepsMs: 0,
                    generatePrismaMs: 0,
                    setupDatabaseMs: 0,
                    diagnoseTypescriptMs: 0,
                },
                testSuites: {
                    unitTestsMs: 0,
                    apiTestsMs: 0,
                    e2eTestsMs: 0,
                    logsTestsMs: 0,
                },
                testCounts: {
                    unitTestCount: 0,
                    apiTestCount: 0,
                    e2eTestCount: 0,
                    logsTestCount: 0,
                },
                performance: {
                    setupTimeSeconds: 0,
                    testTimeSeconds: 0,
                    totalTimeSeconds: 0,
                    setupPercentage: 0,
                    testPercentage: 0,
                }
            });

            const result = safeValidateValidationTiming(zeroData);

            expect(result.success).toBe(true);
        });

        it('should validate with maximum percentage values', () => {
            const maxData = createValidData({
                performance: {
                    setupTimeSeconds: 46.43,
                    testTimeSeconds: 79.73,
                    totalTimeSeconds: 126.16,
                    setupPercentage: 100, // Maximum allowed
                    testPercentage: 100,  // Maximum allowed
                }
            });

            const result = safeValidateValidationTiming(maxData);

            expect(result.success).toBe(true);
        });

        it('should handle empty strings correctly', () => {
            const emptyStringData = createValidData({
                failureReason: '', // Valid empty string
                failureStage: ''   // Valid empty string
            });

            const result = safeValidateValidationTiming(emptyStringData);

            expect(result.success).toBe(true);
        });

        it('should reject completely null/undefined input', () => {
            const result1 = safeValidateValidationTiming(null);
            const result2 = safeValidateValidationTiming(undefined);

            expect(result1.success).toBe(false);
            expect(result2.success).toBe(false);
        });

        it('should reject array input', () => {
            const result = safeValidateValidationTiming([]);

            expect(result.success).toBe(false);
        });

        it('should reject primitive inputs', () => {
            const primitives = ['string', 123, true, false];

            primitives.forEach(primitive => {
                const result = safeValidateValidationTiming(primitive);
                expect(result.success).toBe(false);
            });
        });
    });

    describe('Real-world Scenarios', () => {
        it('should validate full validation run data', () => {
            const fullRunData: ValidationTiming = {
                ...createValidData(),
                mode: 'full',
                success: true,
                totalExecutionTimeMs: 450000,
                totalSetupTimeMs: 150000,
                totalTestTimeMs: 300000,
                totalTestCount: 200,
                setupSteps: {
                    cleanDockerMs: 6120,
                    buildImagesMs: 120500,
                    startServicesMs: 15300,
                    installDepsMs: 4500,
                    generatePrismaMs: 1500,
                    setupDatabaseMs: 2000,
                    diagnoseTypescriptMs: 800,
                },
                testSuites: {
                    unitTestsMs: 120000,
                    apiTestsMs: 150000,
                    e2eTestsMs: 25000,
                    logsTestsMs: 5000,
                },
                testCounts: {
                    unitTestCount: 120,
                    apiTestCount: 60,
                    e2eTestCount: 15,
                    logsTestCount: 5,
                },
                performance: {
                    setupTimeSeconds: 150,
                    testTimeSeconds: 300,
                    totalTimeSeconds: 450,
                    setupPercentage: 33.33,
                    testPercentage: 66.67,
                }
            };

            const result = safeValidateValidationTiming(fullRunData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.mode).toBe('full');
                expect(result.data.setupSteps.cleanDockerMs).toBe(6120);
                expect(result.data.setupSteps.buildImagesMs).toBe(120500);
            }
        });

        it('should validate failed validation run data', () => {
            const failedRunData: ValidationTiming = {
                ...createValidData(),
                success: false,
                failureReason: 'E2E suite failed on login test',
                failureStage: 'testing',
                totalTestTimeMs: 180000,
                totalTestCount: 95,
                testSuites: {
                    unitTestsMs: 120000,
                    apiTestsMs: 60000,
                    e2eTestsMs: 0, // Failed partway through
                    logsTestsMs: 0,
                },
                testCounts: {
                    unitTestCount: 80,
                    apiTestCount: 15, // Only some ran before failure
                    e2eTestCount: 0,
                    logsTestCount: 0,
                }
            };

            const result = safeValidateValidationTiming(failedRunData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.success).toBe(false);
                expect(result.data.failureStage).toBe('testing');
                expect(result.data.testSuites.e2eTestsMs).toBe(0);
            }
        });

        it('should validate production environment data', () => {
            const prodData = createValidData({
                environment: 'PRODUCTION',
                mode: 'full'
            });

            const result = safeValidateValidationTiming(prodData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.environment).toBe('PRODUCTION');
            }
        });
    });
}); 