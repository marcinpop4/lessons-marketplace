import { describe, it, expect } from '@jest/globals';
import {
    safeValidateClientLog,
    validateClientLog,
    validateWithFallback,
    validateSpecificVersion,
    getSchemaInfo,
    type ClientLog,
    type ClientLogV1_0_0,
    SchemaVersions,
    ClientLogsSchemaMetadata
} from '@shared/schemas/client-logs-schema-v1';

/**
 * Test suite for Client Logs schema validation functions
 */
describe('Client Logs Schema Validation', () => {

    // Helper function to create valid test data
    const createValidData = (overrides: Partial<ClientLog> = {}): ClientLog => ({
        schemaVersion: '1.0.0',
        service: 'lessons-marketplace',
        component: 'client-logs',
        environment: 'TEST',
        logLevel: 'INFO',
        eventType: 'PAGE_LOAD',
        message: 'Page loaded successfully',
        context: {
            sessionId: 'session_123456789',
            userId: 'user_456',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            url: 'https://example.com/lessons',
            referrer: 'https://example.com/home',
            viewportWidth: 1920,
            viewportHeight: 1080,
            timestamp: '2024-06-02T14:30:00.000Z',
        },
        performanceMetrics: {
            loadTime: 1234.5,
            renderTime: 567.8,
            domContentLoaded: 890.1,
            firstContentfulPaint: 432.1,
            largestContentfulPaint: 876.5,
            cumulativeLayoutShift: 0.05,
            firstInputDelay: 23.4,
        },
        apiCall: {
            method: 'GET',
            url: 'https://api.example.com/lessons',
            statusCode: 200,
            responseTime: 345.6,
            errorMessage: null,
            requestSize: 1024,
            responseSize: 4096,
        },
        userInteraction: {
            elementType: 'button',
            elementId: 'submit-btn',
            elementClass: 'btn btn-primary',
            interactionType: 'click',
            coordinates: { x: 150, y: 300 },
        },
        error: null,
        customData: { feature: 'lesson-booking', version: '1.2.3' },
        timestamp: '2024-06-02T14:30:00.000Z',
        ...overrides
    });

    describe('validateClientLog()', () => {
        it('should validate correct client log data successfully', () => {
            const validData = createValidData();

            const result = validateClientLog(validData);

            expect(result).toEqual(validData);
            expect(result.schemaVersion).toBe('1.0.0');
            expect(result.service).toBe('lessons-marketplace');
            expect(result.component).toBe('client-logs');
            expect(result.eventType).toBe('PAGE_LOAD');
        });

        it('should validate different event types', () => {
            const eventTypes: Array<'PAGE_LOAD' | 'USER_INTERACTION' | 'API_CALL' | 'ERROR' | 'PERFORMANCE' | 'NAVIGATION'> =
                ['PAGE_LOAD', 'USER_INTERACTION', 'API_CALL', 'ERROR', 'PERFORMANCE', 'NAVIGATION'];

            eventTypes.forEach(eventType => {
                const data = createValidData({ eventType });
                const result = validateClientLog(data);
                expect(result.eventType).toBe(eventType);
            });
        });

        it('should validate different log levels', () => {
            const logLevels: Array<'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'> =
                ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

            logLevels.forEach(logLevel => {
                const data = createValidData({ logLevel });
                const result = validateClientLog(data);
                expect(result.logLevel).toBe(logLevel);
            });
        });

        it('should validate different environments', () => {
            const environments: Array<'DEVELOPMENT' | 'TEST' | 'PRODUCTION'> = ['DEVELOPMENT', 'TEST', 'PRODUCTION'];

            environments.forEach(environment => {
                const data = createValidData({ environment });
                const result = validateClientLog(data);
                expect(result.environment).toBe(environment);
            });
        });

        it('should validate error event with error details', () => {
            const errorData = createValidData({
                eventType: 'ERROR',
                logLevel: 'ERROR',
                message: 'JavaScript error occurred',
                error: {
                    name: 'TypeError',
                    message: 'Cannot read property of undefined',
                    stack: 'TypeError: Cannot read property...\n    at Component.jsx:45:12',
                    filename: 'Component.jsx',
                    lineno: 45,
                    colno: 12,
                    componentStack: 'Component\n  App\n  Router',
                },
                performanceMetrics: null,
                apiCall: null,
                userInteraction: null,
            });

            const result = validateClientLog(errorData);

            expect(result.eventType).toBe('ERROR');
            expect(result.error?.name).toBe('TypeError');
            expect(result.error?.lineno).toBe(45);
        });

        it('should validate API call event', () => {
            const apiData = createValidData({
                eventType: 'API_CALL',
                message: 'API call completed',
                apiCall: {
                    method: 'POST',
                    url: 'https://api.example.com/lessons',
                    statusCode: 201,
                    responseTime: 456.7,
                    errorMessage: null,
                    requestSize: 2048,
                    responseSize: 1024,
                },
                performanceMetrics: null,
                userInteraction: null,
            });

            const result = validateClientLog(apiData);

            expect(result.eventType).toBe('API_CALL');
            expect(result.apiCall?.method).toBe('POST');
            expect(result.apiCall?.statusCode).toBe(201);
        });

        it('should throw error for missing required fields', () => {
            const invalidData = {
                schemaVersion: '1.0.0',
                service: 'lessons-marketplace',
                component: 'client-logs',
                // Missing required fields
            };

            expect(() => {
                validateClientLog(invalidData);
            }).toThrow(/Client log data validation failed \(v1\.0\.0\)/);
        });

        it('should throw error for invalid service name', () => {
            const invalidData = createValidData({
                service: 'wrong-service' as any
            });

            expect(() => {
                validateClientLog(invalidData);
            }).toThrow(/service.*Invalid literal value/);
        });

        it('should throw error for invalid component', () => {
            const invalidData = createValidData({
                component: 'wrong-component' as any
            });

            expect(() => {
                validateClientLog(invalidData);
            }).toThrow(/component.*Invalid literal value/);
        });

        it('should throw error for invalid URL format', () => {
            const invalidData = createValidData({
                context: {
                    ...createValidData().context,
                    url: 'not-a-valid-url'
                }
            });

            expect(() => {
                validateClientLog(invalidData);
            }).toThrow(/url.*Invalid url/);
        });

        it('should throw error for negative performance metrics', () => {
            const invalidData = createValidData({
                performanceMetrics: {
                    loadTime: -100,
                    renderTime: 567.8,
                    domContentLoaded: 890.1,
                    firstContentfulPaint: 432.1,
                    largestContentfulPaint: 876.5,
                    cumulativeLayoutShift: 0.05,
                    firstInputDelay: 23.4,
                }
            });

            expect(() => {
                validateClientLog(invalidData);
            }).toThrow(/loadTime.*Number must be greater than or equal to 0/);
        });

        it('should throw error for invalid interaction coordinates', () => {
            const invalidData = createValidData({
                userInteraction: {
                    elementType: 'button',
                    elementId: 'submit-btn',
                    elementClass: 'btn btn-primary',
                    interactionType: 'click',
                    coordinates: { x: -10, y: 300 }, // Invalid negative coordinate
                }
            });

            expect(() => {
                validateClientLog(invalidData);
            }).toThrow(/x.*Number must be greater than or equal to 0/);
        });
    });

    describe('safeValidateClientLog()', () => {
        it('should return success result for valid data', () => {
            const validData = createValidData();

            const result = safeValidateClientLog(validData);

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

            const result = safeValidateClientLog(invalidData);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('Client log data validation failed (v1.0.0)');
                expect(result.error).toContain('service');
            }
        });

        it('should handle null values correctly', () => {
            const dataWithNulls = createValidData({
                performanceMetrics: null,
                apiCall: null,
                userInteraction: null,
                error: null,
                customData: null,
                context: {
                    ...createValidData().context,
                    userId: null,
                    referrer: null,
                }
            });

            const result = safeValidateClientLog(dataWithNulls);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.performanceMetrics).toBeNull();
                expect(result.data.context.userId).toBeNull();
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
            expect(ClientLogsSchemaMetadata.version).toBe('1.0.0');
            expect(ClientLogsSchemaMetadata.description).toContain('Client-side logging schemas');
            expect(ClientLogsSchemaMetadata.changelog['1.0.0']).toBeDefined();
            expect(ClientLogsSchemaMetadata.changelog['1.0.0'].breaking).toBe(false);
        });
    });

    describe('Edge Cases and Boundary Values', () => {
        it('should validate with zero performance metrics', () => {
            const zeroData = createValidData({
                performanceMetrics: {
                    loadTime: 0,
                    renderTime: 0,
                    domContentLoaded: 0,
                    firstContentfulPaint: 0,
                    largestContentfulPaint: 0,
                    cumulativeLayoutShift: 0,
                    firstInputDelay: 0,
                }
            });

            const result = safeValidateClientLog(zeroData);

            expect(result.success).toBe(true);
        });

        it('should validate with minimum viewport dimensions', () => {
            const minData = createValidData({
                context: {
                    ...createValidData().context,
                    viewportWidth: 0,
                    viewportHeight: 0,
                }
            });

            const result = safeValidateClientLog(minData);

            expect(result.success).toBe(true);
        });

        it('should reject completely null/undefined input', () => {
            const result1 = safeValidateClientLog(null);
            const result2 = safeValidateClientLog(undefined);

            expect(result1.success).toBe(false);
            expect(result2.success).toBe(false);
        });

        it('should reject primitive inputs', () => {
            const primitives = ['string', 123, true, false];

            primitives.forEach(primitive => {
                const result = safeValidateClientLog(primitive);
                expect(result.success).toBe(false);
            });
        });
    });

    describe('Real-world Scenarios', () => {
        it('should validate user interaction tracking', () => {
            const interactionData = createValidData({
                eventType: 'USER_INTERACTION',
                message: 'User clicked lesson booking button',
                userInteraction: {
                    elementType: 'button',
                    elementId: 'book-lesson-123',
                    elementClass: 'btn btn-primary lesson-book-btn',
                    interactionType: 'click',
                    coordinates: { x: 245, y: 567 },
                },
                performanceMetrics: null,
                apiCall: null,
                error: null,
            });

            const result = safeValidateClientLog(interactionData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.eventType).toBe('USER_INTERACTION');
                expect(result.data.userInteraction?.elementId).toBe('book-lesson-123');
            }
        });

        it('should validate performance monitoring data', () => {
            const perfData = createValidData({
                eventType: 'PERFORMANCE',
                message: 'Performance metrics collected',
                performanceMetrics: {
                    loadTime: 2345.6,
                    renderTime: 876.5,
                    domContentLoaded: 1234.0,
                    firstContentfulPaint: 567.8,
                    largestContentfulPaint: 1890.3,
                    cumulativeLayoutShift: 0.12,
                    firstInputDelay: 45.6,
                },
                apiCall: null,
                userInteraction: null,
                error: null,
            });

            const result = safeValidateClientLog(perfData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.eventType).toBe('PERFORMANCE');
                expect(result.data.performanceMetrics?.loadTime).toBe(2345.6);
            }
        });

        it('should validate production environment data', () => {
            const prodData = createValidData({
                environment: 'PRODUCTION',
                logLevel: 'ERROR',
                eventType: 'ERROR',
                message: 'Critical error in production',
                error: {
                    name: 'NetworkError',
                    message: 'Failed to fetch lesson data',
                    stack: null,
                    filename: null,
                    lineno: null,
                    colno: null,
                    componentStack: null,
                },
            });

            const result = safeValidateClientLog(prodData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.environment).toBe('PRODUCTION');
                expect(result.data.error?.name).toBe('NetworkError');
            }
        });
    });
}); 