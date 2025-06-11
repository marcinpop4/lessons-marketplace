import { describe, it, expect } from '@jest/globals';
import {
    safeValidateHttpLog,
    validateHttpLog,
    validateWithFallback,
    validateSpecificVersion,
    getSchemaInfo,
    type HttpLog,
    type HttpLogV1_0_0,
    SchemaVersions,
    HttpLogsSchemaMetadata
} from '../../../../shared/schemas/http-logs-schema-v1';
import { LogLevel } from '../../../../shared/types/LogLevel';

/**
 * Test suite for HTTP Logs schema validation functions
 */
describe('HTTP Logs Schema Validation', () => {

    // Helper function to create valid test data
    const createValidData = (overrides: Partial<HttpLog> = {}): HttpLog => ({
        schemaVersion: '1.0.0',
        service: 'lessons-marketplace',
        component: 'http-logs',
        environment: 'TEST',
        logLevel: LogLevel.Info,
        message: 'Test HTTP log',
        request: {
            method: 'GET',
            url: 'https://api.example.com/lessons/123',
            path: '/lessons/123',
            query: { include: 'teacher', limit: '10' },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer token123',
                'User-Agent': 'lessons-marketplace/1.0.0'
            },
            body: null,
            contentLength: 0,
            userAgent: 'lessons-marketplace/1.0.0',
            clientIp: '192.168.1.100',
            correlationId: '123e4567-e89b-12d3-a456-426614174000',
        },
        response: {
            statusCode: 200,
            statusMessage: 'OK',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: '{"id": 123, "title": "Math Lesson"}',
            contentLength: 32,
            contentType: 'application/json',
        },
        timing: {
            startTime: '2024-06-02T14:30:00.000Z',
            endTime: '2024-06-02T14:30:00.250Z',
            duration: 250.5,
            dnsLookup: 5.2,
            tcpConnection: 12.3,
            tlsHandshake: 45.6,
            timeToFirstByte: 123.4,
            contentTransfer: 67.8,
        },
        error: null,
        security: {
            isHttps: true,
            tlsVersion: 'TLSv1.3',
            cipher: 'AES_256_GCM_SHA384',
            authMethod: 'bearer',
            userId: 'user_456',
            rateLimited: false,
            blocked: false,
        },
        performance: {
            memoryUsage: 1048576,
            cpuUsage: 15.5,
            requestsPerSecond: 42.3,
            concurrentRequests: 8,
            queueTime: 2.1,
        },
        middleware: ['cors', 'auth', 'validation'],
        route: '/api/v1/lessons/:id',
        handler: 'LessonController.getById',
        customData: { feature: 'lesson-api', version: '1.2.3' },
        timestamp: '2024-06-02T14:30:00.250Z',
        ...overrides
    });

    describe('validateHttpLog()', () => {
        it('should validate correct HTTP log data successfully', () => {
            const validData = createValidData();

            const result = validateHttpLog(validData);

            expect(result).toEqual(validData);
            expect(result.schemaVersion).toBe('1.0.0');
            expect(result.service).toBe('lessons-marketplace');
            expect(result.component).toBe('http-logs');
            expect(result.request.method).toBe('GET');
        });

        it('should validate different HTTP methods', () => {
            const methods: Array<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'> =
                ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

            methods.forEach(method => {
                const data = createValidData({
                    request: {
                        ...createValidData().request,
                        method
                    }
                });
                const result = validateHttpLog(data);
                expect(result.request.method).toBe(method);
            });
        });

        it('should validate different log levels', () => {
            const logLevels = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error, LogLevel.Fatal];

            logLevels.forEach(logLevel => {
                const data = createValidData({ logLevel });
                const result = validateHttpLog(data);
                expect(result.logLevel).toBe(logLevel);
            });
        });

        it('should validate different status codes', () => {
            const statusCodes = [200, 201, 400, 401, 404, 500, 502];

            statusCodes.forEach(statusCode => {
                const data = createValidData({
                    response: {
                        ...createValidData().response!,
                        statusCode
                    }
                });
                const result = validateHttpLog(data);
                expect(result.response?.statusCode).toBe(statusCode);
            });
        });

        it('should validate error scenario with error details', () => {
            const errorData = createValidData({
                logLevel: LogLevel.Error,
                message: 'HTTP request failed with error',
                response: {
                    statusCode: 500,
                    statusMessage: 'Internal Server Error',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{"error": "Database connection failed"}',
                    contentLength: 45,
                    contentType: 'application/json',
                },
                error: {
                    name: 'DatabaseError',
                    message: 'Connection timeout',
                    stack: 'DatabaseError: Connection timeout\n    at db.js:123:45',
                    code: 'TIMEOUT',
                    isOperational: true,
                },
            });

            const result = validateHttpLog(errorData);

            expect(result.response?.statusCode).toBe(500);
            expect(result.error?.name).toBe('DatabaseError');
            expect(result.error?.isOperational).toBe(true);
        });

        it('should validate POST request with body', () => {
            const postData = createValidData({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/lessons',
                    path: '/lessons',
                    query: null,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer token123'
                    },
                    body: '{"title": "New Math Lesson", "duration": 60}',
                    contentLength: 45,
                    userAgent: 'lessons-marketplace/1.0.0',
                    clientIp: '192.168.1.100',
                    correlationId: '123e4567-e89b-12d3-a456-426614174000',
                },
                response: {
                    statusCode: 201,
                    statusMessage: 'Created',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{"id": 456, "title": "New Math Lesson"}',
                    contentLength: 42,
                    contentType: 'application/json',
                },
            });

            const result = validateHttpLog(postData);

            expect(result.request.method).toBe('POST');
            expect(result.request.body).toContain('New Math Lesson');
            expect(result.response?.statusCode).toBe(201);
        });

        it('should throw error for missing required fields', () => {
            const invalidData = {
                schemaVersion: '1.0.0',
                service: 'lessons-marketplace',
                component: 'http-logs',
                // Missing required fields
            };

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/HTTP log data validation failed \(v1\.0\.0\)/);
        });

        it('should throw error for invalid HTTP method', () => {
            const invalidData = createValidData({
                request: {
                    ...createValidData().request,
                    method: 'INVALID' as any
                }
            });

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/method.*Invalid enum value/);
        });

        it('should throw error for invalid status code', () => {
            const invalidData = createValidData({
                response: {
                    ...createValidData().response!,
                    statusCode: 99 // Invalid: < 100
                }
            });

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/statusCode.*Number must be greater than or equal to 100/);
        });

        it('should throw error for invalid IP address', () => {
            const invalidData = createValidData({
                request: {
                    ...createValidData().request,
                    clientIp: 'not-an-ip-address'
                }
            });

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/clientIp.*Invalid ip/);
        });

        it('should throw error for invalid UUID correlation ID', () => {
            const invalidData = createValidData({
                request: {
                    ...createValidData().request,
                    correlationId: 'not-a-uuid'
                }
            });

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/correlationId.*Invalid uuid/);
        });

        it('should throw error for negative timing values', () => {
            const invalidData = createValidData({
                timing: {
                    ...createValidData().timing,
                    duration: -10
                }
            });

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/duration.*Number must be greater than or equal to 0/);
        });

        it('should throw error for invalid CPU usage percentage', () => {
            const invalidData = createValidData({
                performance: {
                    ...createValidData().performance!,
                    cpuUsage: 150 // Invalid: > 100
                }
            });

            expect(() => {
                validateHttpLog(invalidData);
            }).toThrow(/cpuUsage.*Number must be less than or equal to 100/);
        });
    });

    describe('safeValidateHttpLog()', () => {
        it('should return success result for valid data', () => {
            const validData = createValidData();

            const result = safeValidateHttpLog(validData);

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

            const result = safeValidateHttpLog(invalidData);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error).toContain('HTTP log data validation failed (v1.0.0)');
                expect(result.error).toContain('service');
            }
        });

        it('should handle null values correctly', () => {
            const dataWithNulls = createValidData({
                response: null,
                error: null,
                security: null,
                performance: null,
                middleware: null,
                route: null,
                handler: null,
                customData: null,
                request: {
                    ...createValidData().request,
                    query: null,
                    body: null,
                    contentLength: null,
                    userAgent: null,
                    clientIp: null,
                    correlationId: null,
                }
            });

            const result = safeValidateHttpLog(dataWithNulls);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.response).toBeNull();
                expect(result.data.error).toBeNull();
                expect(result.data.request.query).toBeNull();
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
            expect(HttpLogsSchemaMetadata.version).toBe('1.0.0');
            expect(HttpLogsSchemaMetadata.description).toContain('HTTP request/response logging schemas');
            expect(HttpLogsSchemaMetadata.changelog['1.0.0']).toBeDefined();
            expect(HttpLogsSchemaMetadata.changelog['1.0.0'].breaking).toBe(false);
        });
    });

    describe('Edge Cases and Boundary Values', () => {
        it('should validate with zero timing values', () => {
            const zeroData = createValidData({
                timing: {
                    startTime: '2024-06-02T14:30:00.000Z',
                    endTime: '2024-06-02T14:30:00.000Z',
                    duration: 0,
                    dnsLookup: 0,
                    tcpConnection: 0,
                    tlsHandshake: 0,
                    timeToFirstByte: 0,
                    contentTransfer: 0,
                }
            });

            const result = safeValidateHttpLog(zeroData);

            expect(result.success).toBe(true);
        });

        it('should validate with minimum status codes', () => {
            const minData = createValidData({
                response: {
                    ...createValidData().response!,
                    statusCode: 100 // Minimum valid status code
                }
            });

            const result = safeValidateHttpLog(minData);

            expect(result.success).toBe(true);
        });

        it('should validate with maximum status codes', () => {
            const maxData = createValidData({
                response: {
                    ...createValidData().response!,
                    statusCode: 599 // Maximum valid status code
                }
            });

            const result = safeValidateHttpLog(maxData);

            expect(result.success).toBe(true);
        });

        it('should reject completely null/undefined input', () => {
            const result1 = safeValidateHttpLog(null);
            const result2 = safeValidateHttpLog(undefined);

            expect(result1.success).toBe(false);
            expect(result2.success).toBe(false);
        });

        it('should reject primitive inputs', () => {
            const primitives = ['string', 123, true, false];

            primitives.forEach(primitive => {
                const result = safeValidateHttpLog(primitive);
                expect(result.success).toBe(false);
            });
        });
    });

    describe('Real-world Scenarios', () => {
        it('should validate authentication endpoint request', () => {
            const authData = createValidData({
                request: {
                    method: 'POST',
                    url: 'https://api.example.com/auth/login',
                    path: '/auth/login',
                    query: null,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Forwarded-For': '192.168.1.100'
                    },
                    body: '{"email": "user@example.com", "password": "[REDACTED]"}',
                    contentLength: 56,
                    userAgent: 'lessons-marketplace-web/1.0.0',
                    clientIp: '192.168.1.100',
                    correlationId: '456e7890-e89b-12d3-a456-426614174001',
                },
                security: {
                    isHttps: true,
                    tlsVersion: 'TLSv1.3',
                    cipher: 'AES_256_GCM_SHA384',
                    authMethod: 'none',
                    userId: null,
                    rateLimited: false,
                    blocked: false,
                },
                route: '/api/v1/auth/login',
                handler: 'AuthController.login',
            });

            const result = safeValidateHttpLog(authData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.request.path).toBe('/auth/login');
                expect(result.data.security?.authMethod).toBe('none');
            }
        });

        it('should validate rate-limited request', () => {
            const rateLimitData = createValidData({
                logLevel: LogLevel.Warn,
                message: 'Request rate limited',
                response: {
                    statusCode: 429,
                    statusMessage: 'Too Many Requests',
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': '60'
                    },
                    body: '{"error": "Rate limit exceeded"}',
                    contentLength: 34,
                    contentType: 'application/json',
                },
                security: {
                    isHttps: true,
                    tlsVersion: 'TLSv1.3',
                    cipher: 'AES_256_GCM_SHA384',
                    authMethod: 'bearer',
                    userId: 'user_456',
                    rateLimited: true,
                    blocked: false,
                },
            });

            const result = safeValidateHttpLog(rateLimitData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.response?.statusCode).toBe(429);
                expect(result.data.security?.rateLimited).toBe(true);
            }
        });

        it('should validate production environment high-load scenario', () => {
            const prodData = createValidData({
                environment: 'PRODUCTION',
                logLevel: LogLevel.Info,
                message: 'High load API request processed',
                timing: {
                    startTime: '2024-06-02T14:30:00.000Z',
                    endTime: '2024-06-02T14:30:01.500Z',
                    duration: 1500.0,
                    dnsLookup: 2.1,
                    tcpConnection: 8.5,
                    tlsHandshake: 35.2,
                    timeToFirstByte: 450.8,
                    contentTransfer: 1003.4,
                },
                performance: {
                    memoryUsage: 2147483648, // 2GB
                    cpuUsage: 85.5,
                    requestsPerSecond: 156.7,
                    concurrentRequests: 45,
                    queueTime: 25.3,
                },
            });

            const result = safeValidateHttpLog(prodData);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.environment).toBe('PRODUCTION');
                expect(result.data.performance?.cpuUsage).toBe(85.5);
                expect(result.data.timing.duration).toBe(1500.0);
            }
        });
    });
}); 