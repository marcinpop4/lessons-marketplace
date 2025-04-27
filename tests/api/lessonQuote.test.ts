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
    // Variables populated by beforeAll
    let studentAuthToken: string | null = null;
    let teacherAuthToken: string | null = null;
    let teacherId: string | null = null;
    let studentId: string | null = null;
    // Variable populated by outer beforeEach
    let createdLessonRequestId: string | null = null;

    // Setup: Run ONCE before all tests in this describe block
    beforeAll(async () => {
        try {
            // Create primary student & teacher (with GUITAR rate) once
            const { user: student, password: studentPassword } = await createTestStudent();
            studentId = student.id;
            studentAuthToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);

            const { user: teacher, password: teacherPassword } = await createTestTeacher([
                { lessonType: LessonType.GUITAR, rateInCents: 4500 }
            ]);
            teacherId = teacher.id;
            teacherAuthToken = await loginTestUser(teacher.email, teacherPassword, UserType.TEACHER);

        } catch (error) {
            console.error('[Test Setup] Error in outer beforeAll for lessonQuote.test.ts:', error);
            // Throw error to prevent tests from running with failed setup
            throw error;
        }
    }, 60000); // Increase timeout slightly for beforeAll if needed

    // Setup: Run BEFORE EACH test (mainly for POST/GET request creation)
    beforeEach(async () => {
        // Ensure tokens are available from beforeAll
        if (!studentAuthToken || !studentId) {
            throw new Error('beforeAll failed to set up student token/ID for beforeEach');
        }
        try {
            // Create a fresh Lesson Request for GUITAR before each test (or suite)
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            futureDate.setHours(11, 0, 0, 0);
            const lessonRequest = await createTestLessonRequest(
                studentAuthToken as string, // Use token from beforeAll
                studentId as string,      // Use ID from beforeAll
                LessonType.GUITAR,          // Request type matches teacher's rate
                futureDate,
                60
            );
            createdLessonRequestId = lessonRequest.id;

        } catch (error) {
            console.error('[Test Setup] Error in outer beforeEach for lessonQuote.test.ts:', error);
            throw error;
        }
    }); // Keep default timeout for beforeEach

    describe('POST /', () => {
        // Payload for generating quotes
        const validQuotePayload = {
            lessonRequestId: '', // Will be set dynamically
            lessonType: LessonType.GUITAR // Use a default type, or get from request
        };

        beforeEach(() => {
            if (createdLessonRequestId) {
                validQuotePayload.lessonRequestId = createdLessonRequestId;
                // TODO: Ideally, fetch the actual LessonRequest and get its type
                // For now, assume GUITAR matches the one created in outer beforeEach
                validQuotePayload.lessonType = LessonType.GUITAR;
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use util
            const response = await createQuoteUnauthenticated(validQuotePayload);
            expect(response.status).toBe(401);
        });

        it('should generate quotes for the lesson request when called by STUDENT (201 Created)', async () => {
            if (!studentAuthToken || !createdLessonRequestId) throw new Error('Student token or Lesson Request ID not available');

            // Use the lower-level util for the core request (Student generates)
            const response = await createQuote(studentAuthToken, validQuotePayload);

            // Assertions on the response
            expect(response.status).toBe(201);
            expect(Array.isArray(response.body)).toBe(true);
            // We can't guarantee how many quotes are generated, but expect at least one if a teacher is available
            // Check if the array is not empty (assuming setup guarantees at least one teacher)
            expect(response.body.length).toBeGreaterThanOrEqual(1);

            const quote: LessonQuote = response.body[0]; // Check the first quote
            expect(quote.id).toBeDefined();
            expect(quote.lessonRequest?.id).toEqual(createdLessonRequestId);
            // Teacher ID will vary based on which teacher was available
            expect(quote.teacher?.id).toBeDefined();
            expect(quote.costInCents).toBeDefined(); // Cost is calculated by backend
            expect(quote.hourlyRateInCents).toBeDefined(); // Rate is set by backend
            expect(quote.createdAt).toBeDefined();
            expect(quote.currentStatus?.status).toEqual(LessonQuoteStatusValue.CREATED);
        }, 20000);

        it('should return 403 Forbidden if requested by a Teacher', async () => {
            if (!teacherAuthToken || !createdLessonRequestId) throw new Error('Teacher token or Lesson Request ID not available');
            // Teacher tries to generate quotes
            const response = await createQuote(teacherAuthToken, validQuotePayload);
            expect(response.status).toBe(403);
        });

        it('should return 400 Bad Request if lessonRequestId is missing', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const { lessonRequestId, ...invalidPayload } = validQuotePayload;
            const response = await createQuote(studentAuthToken, invalidPayload as any);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Valid Lesson Request ID is required.');
        });

        it('should return 400 Bad Request if lessonType is missing', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const { lessonType, ...invalidPayload } = validQuotePayload;
            const response = await createQuote(studentAuthToken, invalidPayload as any);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid lesson type provided');
        });

        it('should return 404 Not Found if lesson request ID does not exist', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const fakeRequestId = uuidv4();
            // Use util
            const response = await createQuote(studentAuthToken, { ...validQuotePayload, lessonRequestId: fakeRequestId });
            expect(response.status).toBe(404);
        });
    });

    describe('GET /', () => {
        let quoteIdForGetTests: string;

        beforeEach(async () => {
            if (!studentAuthToken || !createdLessonRequestId) {
                throw new Error('Setup failed: Student token or Lesson Request ID missing for GET suite beforeEach');
            }
            // This should now work as the teacher created in the outer beforeEach has a GUITAR rate
            const quotes = await createTestLessonQuote(studentAuthToken, {
                lessonRequestId: createdLessonRequestId,
                lessonType: LessonType.GUITAR
            });
            if (!quotes || quotes.length === 0) {
                throw new Error('GET suite beforeEach: Failed to generate quotes.');
            }
            quoteIdForGetTests = quotes[0].id;
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonRequestId) throw new Error('Lesson Request ID not available');
            const response = await getQuotesByLessonRequestIdUnauthenticated(createdLessonRequestId);
            expect(response.status).toBe(401);
        });

        it('should return quotes for the specific lesson request when queried by STUDENT', async () => {
            if (!studentAuthToken || !createdLessonRequestId || !quoteIdForGetTests) throw new Error('Auth token, Lesson Request ID, or Quote ID for GET test not available');
            const response = await getQuotesByLessonRequestId(studentAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            const foundQuote = response.body.find((q: LessonQuote) => q.id === quoteIdForGetTests);
            expect(foundQuote).toBeDefined();
            expect(foundQuote.lessonRequest?.id).toEqual(createdLessonRequestId);
            // Can't easily assert teacherId as it depends on who was available
            expect(foundQuote.teacher?.id).toBeDefined();
        });

        it('should return quotes for the specific lesson request when queried by TEACHER', async () => {
            if (!teacherAuthToken || !createdLessonRequestId || !quoteIdForGetTests) throw new Error('Auth token, Lesson Request ID, or Quote ID for GET test not available');
            const response = await getQuotesByLessonRequestId(teacherAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            const foundQuote = response.body.find((q: LessonQuote) => q.id === quoteIdForGetTests);
            expect(foundQuote).toBeDefined();
        });

        it('should return 400 Bad Request if lessonRequestId query parameter is missing', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/lesson-quotes`) // No query
                .set('Authorization', `Bearer ${studentAuthToken}`);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('lessonRequestId query parameter is required');
        });

        it('should return 404 Not Found for a non-existent lesson request ID in query param', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available for test');
            const fakeRequestId = uuidv4();
            const response = await getQuotesByLessonRequestId(studentAuthToken, fakeRequestId);
            expect(response.status).toBe(404);
            expect(response.body.error).toContain(`Lesson request with ID ${fakeRequestId} not found.`);
        });
    });

    describe('PATCH /:quoteId', () => {
        let quoteToAcceptId: string;
        let patchStudentToken: string;
        let patchTeacherToken: string;
        let patchStudentId: string;
        let patchTeacherId: string;
        let patchLessonRequestId: string;

        beforeEach(async () => {
            try {
                const { user: localStudent, password: localStudentPassword } = await createTestStudent();
                patchStudentId = localStudent.id;
                patchStudentToken = await loginTestUser(localStudent.email, localStudentPassword, UserType.STUDENT);

                // Create teacher - will default to creating a VOICE rate
                const { user: localTeacher, password: localTeacherPassword } = await createTestTeacher();
                patchTeacherId = localTeacher.id;
                patchTeacherToken = await loginTestUser(localTeacher.email, localTeacherPassword, UserType.TEACHER);

                // Explicit rate creation removed - handled by default in createTestTeacher utility

                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 10);
                const localRequest = await createTestLessonRequest(
                    patchStudentToken,
                    patchStudentId,
                    LessonType.VOICE, futureDate, 45
                );
                patchLessonRequestId = localRequest.id;

                const quotes = await createTestLessonQuote(patchStudentToken, {
                    lessonRequestId: patchLessonRequestId,
                    lessonType: LessonType.VOICE
                });

                if (!quotes || quotes.length === 0) {
                    console.error(`[PATCH Setup] Failed to generate quotes! quotes array: ${JSON.stringify(quotes)}`);
                    throw new Error('PATCH Setup: Failed to generate quotes.');
                }
                quoteToAcceptId = quotes[0].id;

            } catch (error) {
                console.error('[PATCH Setup] Error caught in beforeEach:', error);
                throw error;
            }
        }, 45000);

        it('should allow the STUDENT to accept a CREATED quote', async () => {
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            // Use local student token
            const response = await updateQuoteStatus(patchStudentToken, quoteToAcceptId, payload);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(quoteToAcceptId);
            expect(response.body.currentStatus.status).toBe(LessonQuoteStatusValue.ACCEPTED);
            // TODO: Add check that a Lesson was created? (Requires fetching lesson by quoteId)
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            const response = await updateQuoteStatusUnauthenticated(quoteToAcceptId, payload);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if the TEACHER tries to accept the quote', async () => {
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            // Use local teacher token
            const response = await updateQuoteStatus(patchTeacherToken, quoteToAcceptId, payload);
            expect(response.status).toBe(403);
        });

        it('should return 403 Forbidden if an unrelated STUDENT tries to accept the quote', async () => {
            // Use the student token from the outer scope (different from the local one)
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            const response = await updateQuoteStatus(studentAuthToken!, quoteToAcceptId, payload);
            expect(response.status).toBe(403);
        });

        it('should return 400 Bad Request for an invalid status transition (e.g., ACCEPTED -> CREATED)', async () => {
            await updateQuoteStatus(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.ACCEPTED });
            const response = await patchQuoteRaw(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.CREATED });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid target status');
        });

        it('should return 400 Bad Request if status is missing', async () => {
            const response = await patchQuoteRaw(patchStudentToken, quoteToAcceptId, {}); // Empty payload
            expect(response.status).toBe(400);
        });

        it('should return 400 Bad Request if status value is invalid', async () => {
            const response = await patchQuoteRaw(patchStudentToken, quoteToAcceptId, { status: 'INVALID_STATUS' });
            expect(response.status).toBe(400);
        });

        it('should return 404 Not Found if quote ID does not exist', async () => {
            const fakeQuoteId = uuidv4();
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            const response = await updateQuoteStatus(patchStudentToken, fakeQuoteId, payload);
            expect(response.status).toBe(404);
        });
    });
}); 