import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ClientLogV1_0_0 } from '@shared/schemas/client-logs-schema-v1';
import { LogLevel } from '@shared/types/LogLevel';

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Helper ---

/**
 * Creates a valid client log object conforming to the v1.0.0 schema.
 * @param overrides - Optional fields to override the default valid log.
 * @returns A schema-compliant client log object.
 */
const createValidLog = (overrides: Partial<ClientLogV1_0_0> = {}): ClientLogV1_0_0 => {
    const defaultLog: ClientLogV1_0_0 = {
        schemaVersion: '1.0.0',
        service: 'lessons-marketplace',
        component: 'client-logs',
        environment: 'TEST',
        logLevel: LogLevel.Info,
        eventType: 'USER_INTERACTION',
        message: 'This is a test log message.',
        timestamp: new Date().toISOString(),
        context: {
            sessionId: `session-${uuidv4()}`,
            userId: `user-${uuidv4()}`,
            userAgent: 'Jest Test Runner',
            url: 'http://localhost:3000/test',
            referrer: null,
            viewportWidth: 1024,
            viewportHeight: 768,
            timestamp: new Date().toISOString(),
        },
        performanceMetrics: null,
        apiCall: null,
        userInteraction: null,
        error: null,
        customData: {
            testId: uuidv4()
        },
    };

    return {
        ...defaultLog,
        ...overrides,
        context: { ...defaultLog.context, ...overrides.context },
        customData: { ...defaultLog.customData, ...overrides.customData },
    };
};

// --- Test Suite ---

describe('API Integration: /api/v1/logs', () => {

    describe('POST /logs', () => {
        it('should successfully process a single valid client log', async () => {
            const validLog = createValidLog();
            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, { logs: [validLog] });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should successfully process multiple log entries', async () => {
            const multipleLogs = [
                createValidLog({ logLevel: LogLevel.Info, message: 'First log' }),
                createValidLog({ logLevel: LogLevel.Warn, message: 'Second log' }),
                createValidLog({ logLevel: LogLevel.Error, message: 'Third log' }),
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, { logs: multipleLogs });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 3
            });
        });

        it('should successfully process a log with only the minimum required fields', async () => {
            const minimalLog: ClientLogV1_0_0 = {
                schemaVersion: '1.0.0',
                service: 'lessons-marketplace',
                component: 'client-logs',
                environment: 'TEST',
                logLevel: LogLevel.Debug,
                eventType: 'USER_INTERACTION',
                message: 'Minimal log entry',
                timestamp: new Date().toISOString(),
                // Context is required, but its properties can be minimal
                context: {
                    sessionId: `session-${uuidv4()}`,
                    userId: null,
                    userAgent: 'Jest Minimal',
                    url: 'http://localhost/minimal',
                    referrer: null,
                    viewportWidth: 0,
                    viewportHeight: 0,
                    timestamp: new Date().toISOString(),
                },
                // Other top-level fields must be present, but can be null
                performanceMetrics: null,
                apiCall: null,
                userInteraction: null,
                error: null,
                customData: null,
            };

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, { logs: [minimalLog] });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle different valid log levels', async () => {
            const differentLevels = [
                createValidLog({ logLevel: LogLevel.Error }),
                createValidLog({ logLevel: LogLevel.Warn }),
                createValidLog({ logLevel: LogLevel.Info }),
                createValidLog({ logLevel: LogLevel.Debug }),
                createValidLog({ logLevel: LogLevel.Fatal }),
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, { logs: differentLevels });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 5
            });
        });

        it('should return 400 Bad Request if logs field is missing', async () => {
            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                    // Missing logs field
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Invalid logs format: logs field must be an array.');
            }
        });

        it('should return 400 Bad Request if logs is not an array', async () => {
            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                    logs: 'not an array'
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Invalid logs format: logs field must be an array.');
            }
        });

        it('should return 400 Bad Request if logs array is empty', async () => {
            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                    logs: []
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Invalid logs format: logs array cannot be empty.');
            }
        });

        it('should return 400 Bad Request if too many log entries (>100)', async () => {
            const tooManyLogs = Array.from({ length: 101 }, () => createValidLog());

            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                    logs: tooManyLogs
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Too many log entries. Maximum 100 per request.');
            }
        });

        it('should handle logs with long user agent strings (truncation)', async () => {
            const longUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'.repeat(5);
            const logWithLongUserAgent = createValidLog({
                context: {
                    userAgent: longUserAgent,
                    sessionId: `session-${uuidv4()}`,
                    userId: `user-${uuidv4()}`,
                    url: 'http://localhost:3000/test',
                    referrer: null,
                    viewportWidth: 1024,
                    viewportHeight: 768,
                    timestamp: new Date().toISOString(),
                }
            });

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: [logWithLongUserAgent]
            });

            expect(response.status).toBe(200);
            expect(response.data.processed).toBe(1);
        });

        it('should handle logs with complex nested data structures in customData', async () => {
            const complexLog = createValidLog({
                customData: {
                    user: {
                        id: 'user_123',
                        profile: { name: 'John Doe', prefs: { theme: 'dark' } }
                    },
                    transactionId: 'txn-555'
                }
            });

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: [complexLog]
            });

            expect(response.status).toBe(200);
            expect(response.data.processed).toBe(1);
        });

        it('should return 400 for a log missing a required field like schemaVersion', async () => {
            const invalidLog: any = createValidLog();
            delete invalidLog.schemaVersion; // Make it invalid

            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`, { logs: [invalidLog] });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('All 1 client log entries failed validation. First error: Client log data validation failed (v1.0.0): schemaVersion: Invalid literal value, expected "1.0.0"');
            }
        });

        it('should return 400 for a log with an incorrect data type for a field', async () => {
            const invalidLog = createValidLog();
            (invalidLog as any).timestamp = Date.now(); // Make it a number instead of string

            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`, { logs: [invalidLog] });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('All 1 client log entries failed validation. First error: Client log data validation failed (v1.0.0): timestamp: Expected string, received number');
            }
        });

        it('should process logs at the maximum allowed limit (100 entries)', async () => {
            const maxLogs = Array.from({ length: 100 }, () => createValidLog());

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: maxLogs
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 100
            });
        });
    });
}); 