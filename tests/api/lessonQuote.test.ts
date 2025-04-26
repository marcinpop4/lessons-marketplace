import request from 'supertest';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Lesson } from '@shared/models/Lesson';
import { Address } from '@shared/models/Address';
import { Student } from '@shared/models/Student';
import { Teacher } from '@shared/models/Teacher';
import { LessonType } from '@shared/models/LessonType';
import { v4 as uuidv4 } from 'uuid';
import { LessonStatusValue } from '@shared/models/LessonStatus';
// Import status value enum for patching
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';
import { UserType } from '@shared/models/UserType';

// Import test utilities
import { createTestStudent, createTestTeacher, loginTestUser } from './utils/user.utils';
import { createTestLessonRequest } from './utils/lessonRequest.utils';
// Import the new lesson quote utilities AND keep the test helpers
import {
    createTestLessonQuote,
    acceptTestLessonQuote,
    createQuote,
    createQuoteUnauthenticated,
    getQuotesByLessonRequestId,
    getQuotesByLessonRequestIdUnauthenticated,
    updateQuoteStatus,
    updateQuoteStatusUnauthenticated,
    patchQuoteRaw,
} from './utils/lessonQuote.utils';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

describe('API Integration: /api/v1/lesson-quotes', () => {
    let studentAuthToken: string | null = null;
    let teacherAuthToken: string | null = null;
    let teacherId: string | null = null;
    let studentId: string | null = null;
    let createdLessonRequestId: string | null = null;
    let createdQuoteId: string | null = null; // Store ID of the quote created by teacher
    let createdLessonId: string | null = null; // Store ID of lesson created by accepting quote

    // Setup: Uses higher-level helpers, which is fine
    beforeAll(async () => {
        try {
            // 1. Create and Login Student
            const { user: student, password: studentPassword } = await createTestStudent();
            studentId = student.id;
            studentAuthToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);

            // 2. Create and Login Teacher
            const { user: teacher, password: teacherPassword } = await createTestTeacher();
            teacherId = teacher.id;
            teacherAuthToken = await loginTestUser(teacher.email, teacherPassword, UserType.TEACHER);

            // 3. Create a Lesson Request using the student token and util
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            futureDate.setHours(11, 0, 0, 0);
            const lessonRequest = await createTestLessonRequest(
                studentAuthToken as string,
                studentId as string,
                LessonType.GUITAR,
                futureDate,
                60
            );
            createdLessonRequestId = lessonRequest.id;

        } catch (error) {
            console.error('[Test Setup] Error in beforeAll for lessonQuote.test.ts:', error);
            throw error; // Fail fast
        }
    }, 45000); // Keep timeout as setup involves multiple creations/logins

    describe('POST /', () => {
        const validQuotePayload = {
            lessonRequestId: '', // Will be set dynamically
            costInCents: 5000,
            hourlyRateInCents: 5000
        };

        beforeEach(() => {
            // Ensure the dynamic ID is set before each test in this suite
            if (createdLessonRequestId) {
                validQuotePayload.lessonRequestId = createdLessonRequestId;
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use util
            const response = await createQuoteUnauthenticated(validQuotePayload);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if requested by a non-TEACHER role (e.g., STUDENT)', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            // Use util
            const response = await createQuote(studentAuthToken, validQuotePayload);
            expect(response.status).toBe(403);
        });

        it('should create a quote for the lesson request using utility (201 Created)', async () => {
            if (!teacherAuthToken || !createdLessonRequestId) throw new Error('Teacher token or Lesson Request ID not available');

            // Use the lower-level util for the core request
            const response = await createQuote(teacherAuthToken, validQuotePayload);

            // Assertions on the response
            expect(response.status).toBe(201);
            const quote: LessonQuote = response.body;
            expect(quote.id).toBeDefined();
            expect(quote.lessonRequest?.id).toEqual(createdLessonRequestId);
            expect(quote.teacher?.id).toEqual(teacherId);
            expect(quote.costInCents).toEqual(validQuotePayload.costInCents);
            expect(quote.hourlyRateInCents).toEqual(validQuotePayload.hourlyRateInCents);
            expect(quote.createdAt).toBeDefined();
            expect(quote.updatedAt).toBeDefined();
            expect(quote.currentStatus?.status).toEqual(LessonQuoteStatusValue.CREATED);
            expect(quote.teacher).toBeDefined();
            expect(quote.teacher?.id).toEqual(teacherId);
            expect(quote.teacher).not.toHaveProperty('passwordHash');

            createdQuoteId = quote.id; // Store for later tests
        }, 20000);

        it('should return 400 Bad Request if lessonRequestId is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token not available');
            const { lessonRequestId, ...invalidPayload } = validQuotePayload;
            // Use util with invalid payload
            const response = await createQuote(teacherAuthToken, invalidPayload as any);
            expect(response.status).toBe(400);
        });

        // Add tests for missing costInCents, hourlyRateInCents...
        it('should return 400 Bad Request if costInCents is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token not available');
            const { costInCents, ...invalidPayload } = validQuotePayload;
            const response = await createQuote(teacherAuthToken, invalidPayload as any);
            expect(response.status).toBe(400);
        });

        it('should return 400 Bad Request if hourlyRateInCents is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token not available');
            const { hourlyRateInCents, ...invalidPayload } = validQuotePayload;
            const response = await createQuote(teacherAuthToken, invalidPayload as any);
            expect(response.status).toBe(400);
        });

        it('should return 404 Not Found if lesson request ID does not exist', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token not available');
            const fakeRequestId = uuidv4();
            // Use util
            const response = await createQuote(teacherAuthToken, { ...validQuotePayload, lessonRequestId: fakeRequestId });
            expect(response.status).toBe(404);
        });
    });

    describe('GET /', () => {
        // Ensure a quote exists before these tests run
        beforeAll(async () => {
            if (!createdQuoteId && teacherAuthToken && createdLessonRequestId) {
                await createTestLessonQuote(teacherAuthToken, {
                    lessonRequestId: createdLessonRequestId,
                    costInCents: 5000,
                    hourlyRateInCents: 5000
                });
                // Re-fetch the quote ID if it wasn't set correctly in the POST test
                const quotesResponse = await getQuotesByLessonRequestId(teacherAuthToken, createdLessonRequestId);
                if (quotesResponse.body.length > 0) {
                    createdQuoteId = quotesResponse.body[0].id;
                } else {
                    throw new Error("Failed to create prerequisite quote for GET tests");
                }
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonRequestId) throw new Error('Lesson Request ID not available');
            // Use util
            const response = await getQuotesByLessonRequestIdUnauthenticated(createdLessonRequestId);
            expect(response.status).toBe(401);
        });

        it('should return quotes for the specific lesson request when queried by STUDENT', async () => {
            if (!studentAuthToken || !createdLessonRequestId || !createdQuoteId) throw new Error('Auth token, Lesson Request ID, or Quote ID not available');
            // Use util
            const response = await getQuotesByLessonRequestId(studentAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            const foundQuote = response.body.find((q: LessonQuote) => q.id === createdQuoteId);
            expect(foundQuote).toBeDefined();
            expect(foundQuote.lessonRequest?.id).toEqual(createdLessonRequestId);
            expect(foundQuote.teacher?.id).toEqual(teacherId);
        });

        it('should return quotes for the specific lesson request when queried by TEACHER', async () => {
            if (!teacherAuthToken || !createdLessonRequestId || !createdQuoteId) throw new Error('Auth token, Lesson Request ID, or Quote ID not available');
            // Use util
            const response = await getQuotesByLessonRequestId(teacherAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            const foundQuote = response.body.find((q: LessonQuote) => q.id === createdQuoteId);
            expect(foundQuote).toBeDefined();
        });

        it('should return 400 Bad Request if lessonRequestId query parameter is missing', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');
            // Keep direct request: Testing specific lack of query param
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/lesson-quotes`) // No query
                .set('Authorization', `Bearer ${studentAuthToken}`);
            expect(response.status).toBe(400);
        });

        it('should return 404 Not Found for a non-existent lesson request ID in query param', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');
            const fakeRequestId = uuidv4();
            // Use util
            const response = await getQuotesByLessonRequestId(studentAuthToken, fakeRequestId);
            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /:quoteId', () => {
        // Ensure a quote exists before these tests run
        beforeAll(async () => {
            if (!createdQuoteId && teacherAuthToken && createdLessonRequestId) {
                // Create quote if it wasn't created in POST test
                const quote = await createTestLessonQuote(teacherAuthToken, {
                    lessonRequestId: createdLessonRequestId,
                    costInCents: 5000,
                    hourlyRateInCents: 5000
                });
                createdQuoteId = quote.id;
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdQuoteId) throw new Error('Quote ID not available');
            // Use util
            const response = await updateQuoteStatusUnauthenticated(createdQuoteId, { status: LessonQuoteStatusValue.ACCEPTED });
            expect(response.status).toBe(401);
        });

        it('should allow STUDENT to accept the quote using utility (200 OK), creating a lesson', async () => {
            if (!studentAuthToken || !createdQuoteId) throw new Error('Student token or Quote ID not available');

            // Use the higher-level helper as it encapsulates the acceptance logic + lesson creation check
            const createdLesson = await acceptTestLessonQuote(studentAuthToken, createdQuoteId);

            expect(createdLesson).toBeDefined();
            expect(createdLesson.id).toBeDefined();
            expect(createdLesson.quote?.id).toEqual(createdQuoteId);
            expect(createdLesson.currentStatus?.status).toEqual(LessonStatusValue.ACCEPTED);

            createdLessonId = createdLesson.id; // Store for potential future test
        });

        it('should return 400 Bad Request if status is missing or invalid', async () => {
            if (!studentAuthToken || !createdQuoteId) throw new Error('Student token or Quote ID not available');
            // Use raw patch util
            const response = await patchQuoteRaw(studentAuthToken, createdQuoteId, { status: 'INVALID_STATUS' }); // Invalid status
            expect(response.status).toBe(400);

            // Test missing status
            const responseMissing = await patchQuoteRaw(studentAuthToken, createdQuoteId, {}); // Missing status
            expect(responseMissing.status).toBe(400);
        });

        it('should return 404 Not Found for a non-existent quote ID', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const fakeQuoteId = uuidv4();
            // Use util
            const response = await updateQuoteStatus(studentAuthToken, fakeQuoteId, { status: LessonQuoteStatusValue.ACCEPTED });
            expect(response.status).toBe(404);
        });

        it('should return 409 Conflict if STUDENT tries accepting an already accepted quote', async () => {
            if (!studentAuthToken || !createdQuoteId) throw new Error('Student token or Quote ID not available');
            // Ensure the quote is accepted first (it should be from the previous test)
            expect(createdLessonId).toBeDefined(); // Check that a lesson was created

            // Use the lower-level util to attempt acceptance again
            const response = await updateQuoteStatus(studentAuthToken, createdQuoteId, { status: LessonQuoteStatusValue.ACCEPTED });
            // Expect 409 Conflict from the API
            expect(response.status).toBe(409);
        });
    });
}); 