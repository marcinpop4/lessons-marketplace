import request from 'supertest';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Lesson } from '@shared/models/Lesson';
import { Address } from '@shared/models/Address';
import { Student } from '@shared/models/Student';
import { Teacher } from '@shared/models/Teacher';
import { LessonType } from '@prisma/client'; // Enum for request payload
import { v4 as uuidv4 } from 'uuid';

// Seeded user credentials
const SEEDED_STUDENT_EMAIL = 'ethan.parker@example.com';
const SEEDED_TEACHER_EMAIL = 'emily.richardson@musicschool.com'; // Needed for role test
const SEEDED_PASSWORD = '1234';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

describe('API Integration: /api/v1/lesson-quotes', () => {
    let studentAuthToken: string | null = null;
    let teacherAuthToken: string | null = null; // For role testing
    let studentId: string | null = null;
    let createdLessonRequestId: string | null = null;
    let createdQuotes: LessonQuote[] = []; // Move declaration here

    // Test data
    const lessonRequestAddress = {
        street: '55 Quote Test Ln',
        city: 'Quoteburg',
        state: 'QT',
        postalCode: '54321',
        country: 'Quoteland'
    };

    // Setup: Login as student, create a lesson request
    beforeAll(async () => {
        try {
            // 1. Login as Student
            let loginResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: SEEDED_STUDENT_EMAIL, password: SEEDED_PASSWORD, userType: 'STUDENT' });

            if (loginResponse.status !== 200 || !loginResponse.body.accessToken || !loginResponse.body.user?.id) {
                throw new Error(`Failed Student login: ${loginResponse.body.error || 'Login endpoint failed'}`);
            }
            studentAuthToken = `Bearer ${loginResponse.body.accessToken}`;
            studentId = loginResponse.body.user.id;

            // 2. Login as Teacher (for role tests)
            loginResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: SEEDED_TEACHER_EMAIL, password: SEEDED_PASSWORD, userType: 'TEACHER' });
            if (loginResponse.status !== 200 || !loginResponse.body.accessToken) {
                throw new Error(`Failed Teacher login: ${loginResponse.body.error || 'Login endpoint failed'}`);
            }
            teacherAuthToken = `Bearer ${loginResponse.body.accessToken}`;


            // 3. Create a Lesson Request using the student token
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            futureDate.setHours(11, 0, 0, 0);
            const lessonRequestData = {
                studentId: studentId,
                addressObj: lessonRequestAddress,
                type: LessonType.GUITAR,
                startTime: futureDate.toISOString(),
                durationMinutes: 60
            };

            const createReqResponse = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', studentAuthToken)
                .send(lessonRequestData);

            if (createReqResponse.status !== 201 || !createReqResponse.body.lessonRequest?.id) {
                throw new Error(`Failed to create lesson request in setup: ${createReqResponse.body.error || 'Create request endpoint failed'}`);
            }
            createdLessonRequestId = createReqResponse.body.lessonRequest.id;

        } catch (error) {
            console.error('[Test Setup] Error in beforeAll for lessonQuote.test.ts:', error);
            throw error; // Fail fast
        }
    }, 45000); // Timeout for multiple logins + request creation

    // --- Tests will go here --- //

    describe('GET /request/:lessonRequestId', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonRequestId) throw new Error('Lesson Request ID not available');
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/lesson-quotes/request/${createdLessonRequestId}`);
            expect(response.status).toBe(401);
        });

        it('should return quotes for the newly created lesson request', async () => {
            if (!studentAuthToken || !createdLessonRequestId) throw new Error('Auth token or Lesson Request ID not available');

            // Wait a tiny bit to ensure async quote creation (if any) might complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/lesson-quotes/request/${createdLessonRequestId}`)
                .set('Authorization', studentAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            // Check that quotes were actually generated by the POST /lesson-requests endpoint
            expect(response.body.length).toBeGreaterThan(0);
            // Validate first quote structure (optional, but good practice)
            const quote: LessonQuote = response.body[0];
            expect(quote.id).toBeDefined();
            expect(quote.lessonRequest?.id).toEqual(createdLessonRequestId);
            expect(quote.teacher?.id).toBeDefined();
        });

        it('should return 404 Not Found for a non-existent lesson request ID', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');
            const fakeRequestId = uuidv4();
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/lesson-quotes/request/${fakeRequestId}`)
                .set('Authorization', studentAuthToken);
            expect(response.status).toBe(404); // Assuming the controller handles this
        });
    });

    describe('POST /create-quotes', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-quotes/create-quotes')
                .send({ lessonRequestId: createdLessonRequestId });
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if requested by a non-STUDENT role (e.g., TEACHER)', async () => {
            if (!teacherAuthToken || !createdLessonRequestId) throw new Error('Teacher token or Lesson Request ID not available');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-quotes/create-quotes')
                .set('Authorization', teacherAuthToken)
                .send({ lessonRequestId: createdLessonRequestId });
            expect(response.status).toBe(403);
        });

        it('should create quotes for the lesson request and return them (200 OK)', async () => {
            if (!studentAuthToken || !createdLessonRequestId) throw new Error('Student token or Lesson Request ID not available');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-quotes/create-quotes')
                .set('Authorization', studentAuthToken)
                .send({ lessonRequestId: createdLessonRequestId });

            expect(response.status).toBe(200); // Controller likely returns 200
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0); // Seed data should have teachers for GUITAR

            // Basic validation of the first quote
            const quote: LessonQuote = response.body[0];
            expect(quote.id).toBeDefined();
            expect(quote.lessonRequest?.id).toEqual(createdLessonRequestId);
            expect(quote.teacher?.id).toBeDefined();
            expect(quote.costInCents).toBeGreaterThan(0);
            expect(quote.hourlyRateInCents).toBeGreaterThan(0);
            expect(quote.createdAt).toBeDefined();
            expect(quote.updatedAt).toBeDefined();

            // Check for nested teacher details (password should be removed by service/controller)
            expect(quote.teacher).toBeDefined();
            expect(quote.teacher?.id).toEqual(quote.teacher?.id);
            expect(quote.teacher).not.toHaveProperty('passwordHash');

            createdQuotes = response.body;
        }, 20000);

        it('should return 400 Bad Request if lessonRequestId is missing', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-quotes/create-quotes')
                .set('Authorization', studentAuthToken)
                .send({}); // Missing lessonRequestId
            expect(response.status).toBe(400);
        });

        it('should return 404 Not Found if lesson request ID does not exist', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const fakeRequestId = uuidv4();
            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-quotes/create-quotes')
                .set('Authorization', studentAuthToken)
                .send({ lessonRequestId: fakeRequestId });
            expect(response.status).toBe(404); // Controller should check if request exists
        });
    });

    describe('POST /:quoteId/accept', () => {
        let quoteToAccept: LessonQuote | null = null;

        beforeAll(() => {
            if (createdQuotes.length > 0) {
                quoteToAccept = createdQuotes[0];
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!quoteToAccept) return;
            const response = await request(API_BASE_URL!)
                .post(`/api/v1/lesson-quotes/${quoteToAccept.id}/accept`);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if requested by a non-STUDENT role', async () => {
            if (!teacherAuthToken || !quoteToAccept) return;
            const response = await request(API_BASE_URL!)
                .post(`/api/v1/lesson-quotes/${quoteToAccept.id}/accept`)
                .set('Authorization', teacherAuthToken);
            expect(response.status).toBe(403);
        });

        it('should accept the quote and create a lesson (200 OK)', async () => {
            if (!studentAuthToken || !quoteToAccept) return;

            const response = await request(API_BASE_URL!)
                .post(`/api/v1/lesson-quotes/${quoteToAccept.id}/accept`)
                .set('Authorization', studentAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toBeDefined();

            // Response should be the newly created Lesson object
            const createdLesson = response.body as any;
            expect(createdLesson.id).toBeDefined();
            expect(createdLesson.quote?.id).toEqual(quoteToAccept.id);
            expect(createdLesson.currentStatus).toEqual('REQUESTED');
            expect(createdLesson.createdAt).toBeDefined();
            expect(createdLesson.updatedAt).toBeDefined();

            // Should include nested quote, request, student, teacher etc.
            expect(createdLesson.quote).toBeDefined();
            expect(createdLesson.quote?.id).toEqual(quoteToAccept.id);
            expect(createdLesson.quote?.lessonRequest).toBeDefined();
            expect(createdLesson.quote?.lessonRequest?.id).toEqual(createdLessonRequestId);
            expect(createdLesson.quote?.teacher).toBeDefined();
            expect(createdLesson.quote?.lessonRequest?.student).toBeDefined();

            // Passwords should be removed
            expect(createdLesson.quote?.teacher).not.toHaveProperty('passwordHash');
            expect(createdLesson.quote?.lessonRequest?.student).not.toHaveProperty('passwordHash');
        });

        it('should return 404 Not Found for a non-existent quote ID', async () => {
            if (!studentAuthToken) return;
            const fakeQuoteId = uuidv4();
            const response = await request(API_BASE_URL!)
                .post(`/api/v1/lesson-quotes/${fakeQuoteId}/accept`)
                .set('Authorization', studentAuthToken);
            expect(response.status).toBe(404);
        });

        it('should return 409 Conflict (or similar) if accepting a quote already associated with a lesson', async () => {
            if (!studentAuthToken || !quoteToAccept) return;

            const response = await request(API_BASE_URL!)
                .post(`/api/v1/lesson-quotes/${quoteToAccept.id}/accept`)
                .set('Authorization', studentAuthToken);

            // Expecting a conflict or bad request type error
            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.status).toBeLessThan(500);
            // Specific status code depends on controller implementation (e.g., 409 Conflict or 400 Bad Request)
            expect(response.body.error).toBeDefined();
        });
    });
}); 