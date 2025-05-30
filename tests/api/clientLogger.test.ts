import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Suite ---

describe('API Integration: /api/v1/logs', () => {

    describe('POST /logs', () => {
        it('should successfully process valid client logs', async () => {
            const validLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'User logged in successfully',
                    data: {
                        userId: 'user_123',
                        action: 'login',
                        method: 'email'
                    },
                    sessionId: 'sess_1642251045123_abc123',
                    userId: 'user_123',
                    url: 'https://app.example.com/login',
                    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    viewport: {
                        width: 1920,
                        height: 1080
                    }
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: validLogs
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should successfully process multiple log entries', async () => {
            const multipleLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Page view',
                    data: { page: '/dashboard' },
                    sessionId: 'sess_123'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Slow API response',
                    data: { endpoint: '/api/users', responseTime: 3000 },
                    sessionId: 'sess_123'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'JavaScript error',
                    data: {
                        error: 'Cannot read property of undefined',
                        filename: 'app.js',
                        lineno: 42
                    },
                    sessionId: 'sess_123'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: multipleLogs
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 3
            });
        });

        it('should process logs with minimal required fields', async () => {
            const minimalLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'debug',
                    message: 'Debug message'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: minimalLogs
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle different log levels', async () => {
            const differentLevels = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'Error log'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Warning log'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Info log'
                },
                {
                    timestamp: new Date().toISOString(),
                    level: 'debug',
                    message: 'Debug log'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: differentLevels
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 4
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
                expect(error.response?.data?.error).toBe('Invalid logs format');
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
                expect(error.response?.data?.error).toBe('Invalid logs format');
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
                expect(error.response?.data?.error).toBe('Invalid logs format');
            }
        });

        it('should return 400 Bad Request if too many log entries (>100)', async () => {
            // Create 101 log entries
            const tooManyLogs = Array.from({ length: 101 }, (_, index) => ({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Log entry ${index + 1}`
            }));

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
            const longUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'.repeat(5); // Very long string

            const logsWithLongUserAgent = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Test with long user agent',
                    userAgent: longUserAgent
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: logsWithLongUserAgent
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle logs with complex nested data structures', async () => {
            const complexLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Complex data structure',
                    data: {
                        user: {
                            id: 'user_123',
                            profile: {
                                name: 'John Doe',
                                preferences: {
                                    theme: 'dark',
                                    language: 'en',
                                    notifications: {
                                        email: true,
                                        push: false
                                    }
                                }
                            }
                        },
                        event: {
                            type: 'click',
                            target: 'button#submit',
                            metadata: {
                                timestamp: Date.now(),
                                coordinates: { x: 100, y: 200 }
                            }
                        }
                    },
                    sessionId: 'sess_complex_' + uuidv4(),
                    userId: 'user_123'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: complexLogs
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle malformed JSON gracefully', async () => {
            try {
                await axios.post(`${API_BASE_URL}/api/v1/logs`,
                    'malformed json content',
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }
                );
                throw new Error('Request should have failed');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                // Should return either 400 (bad request) or 500 (server error)
                expect([400, 500]).toContain(error.response?.status);
            }
        });

        it('should accept logs without optional fields', async () => {
            const logsWithoutOptionalFields = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Minimal log entry'
                    // No data, sessionId, userId, url, userAgent, or viewport
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: logsWithoutOptionalFields
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should process logs at the maximum allowed limit (100 entries)', async () => {
            // Create exactly 100 log entries
            const maxLogs = Array.from({ length: 100 }, (_, index) => ({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Log entry ${index + 1}`,
                data: { index: index + 1 }
            }));

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: maxLogs
            });

            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 100
            });
        });

        it('should handle logs with sensitive data fields (password, token, etc.)', async () => {
            const logsWithSensitiveData = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'Login attempt with sensitive data',
                    data: {
                        userId: 'user_123',
                        password: 'super-secret-password',
                        token: 'bearer-token-12345',
                        authorization: 'Bearer jwt-token-secret',
                        cookie: 'session-cookie-value',
                        accessToken: 'access-token-abcdef',
                        secret: 'api-secret-key',
                        apiKey: 'api-key-xyz789',
                        normalField: 'this should be preserved'
                    },
                    sessionId: 'sess_sensitive_test'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: logsWithSensitiveData
            });

            // Should still process successfully - scrubbing happens in logging layer
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle logs with nested sensitive data', async () => {
            const logsWithNestedSensitiveData = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'error',
                    message: 'API error with nested sensitive data',
                    data: {
                        request: {
                            headers: {
                                authorization: 'Bearer secret-jwt-token',
                                cookie: 'session=abc123; csrf=xyz789'
                            },
                            body: {
                                username: 'john.doe',
                                password: 'user-password-123',
                                confirmPassword: 'user-password-123'
                            }
                        },
                        response: {
                            headers: {
                                'set-cookie': 'new-session=def456'
                            },
                            body: {
                                accessToken: 'new-access-token',
                                refreshToken: 'new-refresh-token',
                                userData: {
                                    id: 'user_456',
                                    email: 'john.doe@example.com'
                                }
                            }
                        },
                        config: {
                            apiKey: 'internal-api-key',
                            secret: 'application-secret'
                        }
                    },
                    sessionId: 'sess_nested_sensitive'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: logsWithNestedSensitiveData
            });

            // Should still process successfully - scrubbing happens in logging layer
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle logs with sensitive fields in different cases', async () => {
            const logsWithMixedCaseSensitiveData = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Mixed case sensitive fields',
                    data: {
                        Password: 'uppercase-password',
                        TOKEN: 'uppercase-token',
                        Authorization: 'mixed-case-auth',
                        accesstoken: 'lowercase-accesstoken',
                        Secret: 'mixed-case-secret',
                        APIKEY: 'uppercase-apikey',
                        regularField: 'should be preserved'
                    },
                    sessionId: 'sess_mixed_case'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: logsWithMixedCaseSensitiveData
            });

            // Should still process successfully - scrubbing happens in logging layer
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle logs with sensitive data in arrays', async () => {
            const logsWithSensitiveArrays = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'debug',
                    message: 'Sensitive data in arrays',
                    data: {
                        users: [
                            {
                                id: 'user_1',
                                password: 'password1',
                                token: 'token1'
                            },
                            {
                                id: 'user_2',
                                password: 'password2',
                                token: 'token2'
                            }
                        ],
                        requests: [
                            {
                                headers: { authorization: 'Bearer token1' },
                                cookies: { session: 'session1' }
                            },
                            {
                                headers: { authorization: 'Bearer token2' },
                                cookies: { session: 'session2' }
                            }
                        ]
                    },
                    sessionId: 'sess_array_sensitive'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: logsWithSensitiveArrays
            });

            // Should still process successfully - scrubbing happens in logging layer
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });

        it('should handle logs mixing sensitive and non-sensitive data', async () => {
            const mixedDataLogs = [
                {
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Mixed sensitive and safe data',
                    data: {
                        // Safe data
                        userId: 'user_789',
                        action: 'profile_update',
                        timestamp: Date.now(),
                        userAgent: 'Mozilla/5.0',
                        ip: '192.168.1.1',

                        // Sensitive data
                        password: 'secret-password',
                        oldPassword: 'old-secret-password',
                        token: 'auth-token-secret',
                        sessionCookie: 'session-data',

                        // Nested mixed data
                        metadata: {
                            version: '1.0.0',
                            environment: 'production',
                            secrets: {
                                apiKey: 'secret-api-key',
                                dbPassword: 'database-password'
                            },
                            settings: {
                                theme: 'dark',
                                language: 'en'
                            }
                        }
                    },
                    sessionId: 'sess_mixed_data'
                }
            ];

            const response = await axios.post(`${API_BASE_URL}/api/v1/logs`, {
                logs: mixedDataLogs
            });

            // Should still process successfully - scrubbing happens in logging layer
            expect(response.status).toBe(200);
            expect(response.data).toEqual({
                success: true,
                processed: 1
            });
        });
    });
}); 