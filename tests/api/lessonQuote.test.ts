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

    // Setup: Run BEFORE EACH test to ensure isolation
    beforeEach(async () => {
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
            console.error('[Test Setup] Error in beforeEach for lessonQuote.test.ts:', error);
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
        let quoteIdForGetTests: string; // Specific ID for this suite

        // Create a quote specifically for the GET tests before each one runs
        beforeEach(async () => {
            if (!teacherAuthToken || !createdLessonRequestId) {
                throw new Error('Setup failed: Teacher token or Lesson Request ID missing for GET suite beforeEach');
            }
            const quote = await createTestLessonQuote(teacherAuthToken, {
                lessonRequestId: createdLessonRequestId,
                costInCents: 5123, // Use a distinct cost
                hourlyRateInCents: 5123
            });
            quoteIdForGetTests = quote.id;
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonRequestId) throw new Error('Lesson Request ID not available');
            // Use util
            const response = await getQuotesByLessonRequestIdUnauthenticated(createdLessonRequestId);
            expect(response.status).toBe(401);
        });

        it('should return quotes for the specific lesson request when queried by STUDENT', async () => {
            if (!studentAuthToken || !createdLessonRequestId || !quoteIdForGetTests) throw new Error('Auth token, Lesson Request ID, or Quote ID for GET test not available');
            // Use util
            const response = await getQuotesByLessonRequestId(studentAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            const foundQuote = response.body.find((q: LessonQuote) => q.id === quoteIdForGetTests); // Use specific ID
            expect(foundQuote).toBeDefined();
            expect(foundQuote.lessonRequest?.id).toEqual(createdLessonRequestId);
            expect(foundQuote.teacher?.id).toEqual(teacherId);
        });

        it('should return quotes for the specific lesson request when queried by TEACHER', async () => {
            if (!teacherAuthToken || !createdLessonRequestId || !quoteIdForGetTests) throw new Error('Auth token, Lesson Request ID, or Quote ID for GET test not available');
            // Use util
            const response = await getQuotesByLessonRequestId(teacherAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            const foundQuote = response.body.find((q: LessonQuote) => q.id === quoteIdForGetTests); // Use specific ID
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
            if (!studentAuthToken) throw new Error('Auth token not available for test');
            const fakeRequestId = uuidv4();
            // Use util
            const response = await getQuotesByLessonRequestId(studentAuthToken, fakeRequestId);
            // Expect 404 because the service now checks if the request ID exists
            expect(response.status).toBe(404);
            expect(response.body.error).toContain(`Lesson request with ID ${fakeRequestId} not found.`);
        });
    });

    describe('PATCH /:quoteId', () => {
        let quoteToAcceptId: string;
        // Define local variables for this suite's isolated setup
        let patchStudentToken: string;
        let patchTeacherToken: string;
        let patchStudentId: string;
        let patchTeacherId: string;
        let patchLessonRequestId: string;

        beforeEach(async () => { // Changed from beforeAll
            // Ensure a completely fresh setup for each PATCH test
            try {
                // 1. Create local student & login
                const { user: localStudent, password: localStudentPassword } = await createTestStudent();
                patchStudentId = localStudent.id;
                patchStudentToken = await loginTestUser(localStudent.email, localStudentPassword, UserType.STUDENT);

                // 2. Create local teacher & login
                const { user: localTeacher, password: localTeacherPassword } = await createTestTeacher();
                patchTeacherId = localTeacher.id;
                patchTeacherToken = await loginTestUser(localTeacher.email, localTeacherPassword, UserType.TEACHER);

                // 3. Create local lesson request
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 10);
                const localRequest = await createTestLessonRequest(
                    patchStudentToken, // Use local token
                    patchStudentId,   // Use local ID
                    LessonType.VOICE, futureDate, 45
                );
                patchLessonRequestId = localRequest.id;

                // 4. Create local quote using local teacher and local request
                const quoteData = { lessonRequestId: patchLessonRequestId, costInCents: 4500, hourlyRateInCents: 4500 };
                const quote = await createTestLessonQuote(patchTeacherToken, quoteData);
                quoteToAcceptId = quote.id;
            } catch (error) {
                console.error("Error in PATCH /:quoteId beforeEach setup:", error);
                throw error;
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await updateQuoteStatusUnauthenticated(quoteToAcceptId, { status: LessonQuoteStatusValue.ACCEPTED });
            expect(response.status).toBe(401);
        });

        it('should allow STUDENT to accept the quote (200 OK), returning the updated quote', async () => {
            // Use locally scoped token and quote ID
            if (!patchStudentToken) throw new Error('Patch suite student token missing');

            const response = await updateQuoteStatus(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.ACCEPTED });

            expect(response.status).toBe(200);
            // Check the returned QUOTE object
            expect(response.body).toHaveProperty('id', quoteToAcceptId);
            expect(response.body.currentStatus).toBeDefined();
            expect(response.body.currentStatus.status).toBe(LessonQuoteStatusValue.ACCEPTED);
        });

        it('should return 400 Bad Request if status is missing or invalid', async () => {
            // Use locally scoped token and quote ID
            if (!patchStudentToken) throw new Error('Patch suite student token missing');
            // Missing status - Use direct request
            let response = await request(API_BASE_URL!)
                .patch(`/api/v1/lesson-quotes/${quoteToAcceptId}`)
                .set('Authorization', `Bearer ${patchStudentToken}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing status value');

            // Invalid status - Use direct request
            response = await request(API_BASE_URL!)
                .patch(`/api/v1/lesson-quotes/${quoteToAcceptId}`)
                .set('Authorization', `Bearer ${patchStudentToken}`)
                .send({ status: 'MAYBE' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing status value');
        });

        it('should return 404 Not Found for a non-existent quote ID', async () => {
            // Use locally scoped token
            if (!patchStudentToken) throw new Error('Patch suite student token missing');
            const fakeQuoteId = uuidv4();
            const response = await updateQuoteStatus(patchStudentToken, fakeQuoteId, { status: LessonQuoteStatusValue.ACCEPTED });
            expect(response.status).toBe(404);
        });

        it('should return 409 Conflict if STUDENT tries accepting an already accepted quote', async () => {
            // Use locally scoped token and quote ID
            if (!quoteToAcceptId || !patchStudentToken) {
                throw new Error('Test setup failed: quoteToAcceptId or patchStudentToken missing.');
            }

            // 1. First Acceptance (should succeed)
            const firstAcceptResponse = await updateQuoteStatus(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.ACCEPTED });

            // Check if the first acceptance actually worked
            if (firstAcceptResponse.status !== 200) {
                console.error("Unexpected failure during first quote acceptance in conflict test:", firstAcceptResponse.body);
                throw new Error(`Prerequisite failed: Could not accept quote ${quoteToAcceptId} initially. Status: ${firstAcceptResponse.status}`);
            }

            // 2. Second Acceptance (should fail with 409)
            const secondAcceptResponse = await updateQuoteStatus(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.ACCEPTED });

            // Assertions for the second attempt
            expect(secondAcceptResponse.status).toBe(409);
            expect(secondAcceptResponse.body.error).toContain('Conflict: Quote');
            expect(secondAcceptResponse.body.error).toContain('already been accepted');
        });
    });
}); 