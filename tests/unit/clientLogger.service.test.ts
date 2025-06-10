import { describe, it, expect, beforeEach } from '@jest/globals';
import { clientLoggerService } from '../../server/clientLogger/clientLogger.service';
import { BadRequestError } from '../../server/errors/index';
import pino from 'pino';
import { Writable } from 'stream';

// Get the class from the exported instance's constructor
const ClientLoggerService = clientLoggerService.constructor as new (logger: pino.Logger) => typeof clientLoggerService;

describe('ClientLoggerService', () => {
    let service: typeof clientLoggerService;
    let logger: pino.Logger;
    let logOutput: any[] = [];

    beforeEach(() => {
        logOutput = [];
        const stream = new Writable({
            write(chunk, encoding, callback) {
                logOutput.push(JSON.parse(chunk.toString()));
                callback();
            }
        });
        logger = pino({ level: 'info' }, stream);
        service = new ClientLoggerService(logger);
    });


    describe('Failing Test for Invalid apiCall Schema', () => {
        it('should throw a BadRequestError when a log contains an apiCall object with an invalid URL and missing required fields', async () => {
            // This payload mimics the real-world error log where the frontend logger
            // incorrectly creates an apiCall object for its own logging request.
            const invalidLogPayload = {
                schemaVersion: '1.0.0',
                service: 'lessons-marketplace',
                component: 'client-logs',
                environment: 'DEVELOPMENT',
                logLevel: 'WARN',
                message: 'HTTP Error Response',
                timestamp: '2025-06-10T17:46:00.664Z',
                context: {
                    sessionId: 'mbqta6tpukg1dfgpehr',
                    userId: 'de58b4a6-4a77-4157-a15a-0c25057850d9',
                    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                    url: 'http://localhost:5173/student/objectives',
                    referrer: 'http://localhost:5173/student/teacher-quotes/4ccd9333-7de3-4b6f-98ef-7592cac2fb3a',
                    viewportWidth: 695,
                    viewportHeight: 551,
                    timestamp: '2025-06-10T17:46:00.665Z'
                },
                performanceMetrics: null,
                // This is the malformed part based on the error log
                apiCall: {
                    url: '/api/v1/logs', // Invalid URL that should be caught
                    method: 'GET',
                    status: 400,
                    correlationId: null
                    // Missing: statusCode, responseTime, errorMessage, requestSize, responseSize
                },
                userInteraction: null,
                error: null,
                // Missing: eventType
                customData: {
                    url: '/api/v1/logs',
                    status: 400,
                    statusText: 'Bad Request'
                }
            };

            const request = {
                logs: [invalidLogPayload]
            };

            // We expect the service to reject this entire batch because the only log is invalid.
            await expect(service.processLogs(request)).rejects.toThrow(BadRequestError);
            await expect(service.processLogs(request)).rejects.toThrow(
                /All 1 client log entries failed validation. First error: Client log data validation failed/
            );
        });

        it('should process a valid log successfully', async () => {
            const validLog = {
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
                    userAgent: 'Mozilla/5.0',
                    url: 'https://example.com/lessons',
                    referrer: 'https://example.com/home',
                    viewportWidth: 1920,
                    viewportHeight: 1080,
                    timestamp: '2024-06-02T14:30:00.000Z',
                },
                performanceMetrics: null,
                apiCall: null,
                userInteraction: null,
                error: null,
                customData: null,
                timestamp: '2024-06-02T14:30:00.000Z',
            };

            const request = {
                logs: [validLog]
            };

            const result = await service.processLogs(request);
            expect(result.success).toBe(true);
            expect(result.processed).toBe(1);
            expect(logOutput.length).toBe(1);
            expect(logOutput[0].message).toBe('Page loaded successfully');
            expect(logOutput[0].level).toBe('info'); // pino's string level for INFO
        });
    });
});
