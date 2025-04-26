import request from 'supertest';
import { Lesson } from '../../shared/models/Lesson';
import { LessonStatusValue, LessonStatusTransition } from '../../shared/models/LessonStatus';
import { UserType } from '../../shared/models/UserType'; // Import UserType
import { LessonType } from '../../shared/models/LessonType'; // Import LessonType
import { v4 as uuidv4 } from 'uuid'; // Import uuid

// Import ALL necessary test utilities
import { createTestStudent, createTestTeacher, loginTestUser } from './utils/user.utils';
import { createTestLessonRequest } from './utils/lessonRequest.utils';
import { createTestLessonQuote, acceptTestLessonQuote } from './utils/lessonQuote.utils';
// Import Lesson utilities
import {
    getLessons,
    getLessonsUnauthenticated,
    createLesson,
    createLessonUnauthenticated,
    getLessonById,
    getLessonByIdUnauthenticated,
    updateLessonStatus,
    updateLessonStatusUnauthenticated,
    patchLessonRaw,
} from './utils/lesson.utils';

// Get API_BASE_URL from environment (still needed for direct requests)
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

// No longer need SEEDED constants

describe('API Integration: /api/v1/lessons', () => {
    let teacherId: string | null = null;
    let teacherAuthToken: string | null = null; // Store raw token
    let studentId: string | null = null;
    let studentAuthToken: string | null = null; // Store raw token
    let createdLessonId: string | null = null;
    let createdQuoteId: string | null = null; // Store quote ID for testing ?quoteId=

    // Setup: Create teacher, student, request, quote, and lesson
    beforeAll(async () => {
        try {
            // Create users and login (store raw tokens)
            const { user: teacher, password: teacherPassword } = await createTestTeacher();
            teacherId = teacher.id;
            teacherAuthToken = await loginTestUser(teacher.email, teacherPassword, UserType.TEACHER);
            const { user: student, password: studentPassword } = await createTestStudent();
            studentId = student.id;
            studentAuthToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);
            // Create request
            const lessonRequest = await createTestLessonRequest(studentAuthToken!, studentId!, LessonType.DRUMS);
            // Create quote
            const quoteData = { lessonRequestId: lessonRequest.id, costInCents: 6000, hourlyRateInCents: 6000 };
            const quote = await createTestLessonQuote(teacherAuthToken!, quoteData);
            createdQuoteId = quote.id; // Store quote ID
            // Accept quote to create lesson
            const lesson = await acceptTestLessonQuote(studentAuthToken!, quote.id);
            createdLessonId = lesson.id;

        } catch (error) {
            console.error('[Lesson Test Setup Error]', error);
            throw error;
        }
    }, 60000);

    // --- GET /lessons (Combined Filters) --- 
    describe('GET /lessons (Combined Filters)', () => {

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use unauthenticated util
            const response = await getLessonsUnauthenticated({ teacherId: teacherId! });
            expect(response.status).toBe(401);
        });

        it('should return 400 Bad Request if NEITHER teacherId NOR quoteId is provided', async () => {
            // Keep direct request: Testing specific lack of query params
            const response = await request(API_BASE_URL!)
                .get('/api/v1/lessons')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Exactly one of teacherId or quoteId');
        });

        it('should return 400 Bad Request if BOTH teacherId AND quoteId are provided', async () => {
            // Keep direct request: Testing specific combination of query params
            const response = await request(API_BASE_URL!)
                .get('/api/v1/lessons')
                .query({ teacherId: teacherId!, quoteId: createdQuoteId! })
                .set('Authorization', `Bearer ${teacherAuthToken}`)
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Exactly one of teacherId or quoteId');
        });

        // --- Tests for teacherId filter --- 
        describe('using ?teacherId=...', () => {
            it('should return 403 Forbidden if requesting as the wrong role (STUDENT)', async () => {
                // Use util
                const response = await getLessons(studentAuthToken!, { teacherId: teacherId! });
                expect(response.status).toBe(403);
                expect(response.body.error).toContain('Only teachers can filter by teacherId');
            });

            it('should return 403 Forbidden if requesting lessons for a different teacher ID', async () => {
                const otherTeacherId = 'some-other-teacher-id-not-created';
                // Use util
                const response = await getLessons(teacherAuthToken!, { teacherId: otherTeacherId });
                expect(response.status).toBe(403);
                expect(response.body.error).toContain('Teachers can only retrieve their own lessons');
            });

            it('should return lessons for the authenticated teacher', async () => {
                // Use util
                const response = await getLessons(teacherAuthToken!, { teacherId: teacherId! });
                expect(response.status).toBe(200);
                expect(response.body).toBeInstanceOf(Array);
                expect(response.body.length).toBeGreaterThan(0);
                const foundLesson = response.body.find((l: Lesson) => l.id === createdLessonId);
                expect(foundLesson).toBeDefined();
                expect(foundLesson.quote?.teacher?.id).toEqual(teacherId);
            });
        });

        // --- Tests for quoteId filter --- 
        describe('using ?quoteId=...', () => {
            it('should return lessons for the TEACHER associated with the quote', async () => {
                // Use util
                const response = await getLessons(teacherAuthToken!, { quoteId: createdQuoteId! });
                expect(response.status).toBe(200);
                expect(response.body).toBeInstanceOf(Array);
                expect(response.body.length).toBeGreaterThan(0);
                const foundLesson = response.body.find((l: Lesson) => l.id === createdLessonId);
                expect(foundLesson).toBeDefined();
                expect(foundLesson.quote?.id).toEqual(createdQuoteId);
            });

            it('should return lessons for the STUDENT associated with the quote', async () => {
                // Use util
                const response = await getLessons(studentAuthToken!, { quoteId: createdQuoteId! });
                expect(response.status).toBe(200);
                expect(response.body).toBeInstanceOf(Array);
                expect(response.body.length).toBeGreaterThan(0);
                const foundLesson = response.body.find((l: Lesson) => l.id === createdLessonId);
                expect(foundLesson).toBeDefined();
                expect(foundLesson.quote?.id).toEqual(createdQuoteId);
            });

            it('should return 403 Forbidden for an unrelated user', async () => {
                // Create a third user (another student)
                const { user: otherStudent, password: otherPassword } = await createTestStudent();
                const otherToken = await loginTestUser(otherStudent.email, otherPassword, UserType.STUDENT);

                // Use util
                const response = await getLessons(otherToken, { quoteId: createdQuoteId! });
                expect(response.status).toBe(403);
                expect(response.body.error).toContain('User is not authorized to view lessons for this quote');
            });

            it('should return empty array for a non-existent quoteId', async () => {
                const fakeQuoteId = uuidv4();
                // Use util
                const response = await getLessons(teacherAuthToken!, { quoteId: fakeQuoteId });
                expect(response.status).toBe(200);
                expect(response.body).toBeInstanceOf(Array);
                expect(response.body.length).toBe(0);
            });
        });
    });

    // --- POST /lessons --- 
    describe('POST /', () => {
        let anotherQuoteId: string; // For testing creation

        beforeAll(async () => {
            // Need a separate, unaccepted quote for creation tests
            const request = await createTestLessonRequest(studentAuthToken!, studentId!, LessonType.GUITAR);
            const quoteData = { lessonRequestId: request.id, costInCents: 5500, hourlyRateInCents: 5500 };
            const quote = await createTestLessonQuote(teacherAuthToken!, quoteData);
            anotherQuoteId = quote.id;
        });

        it('should create a lesson when a valid quote ID is provided', async () => {
            // Use util
            const response = await createLesson(studentAuthToken!, { quoteId: anotherQuoteId });

            expect(response.status).toBe(201);
            expect(response.body.id).toBeDefined();
            expect(response.body.quote.id).toBe(anotherQuoteId);
            expect(response.body.currentStatus.status).toBe(LessonStatusValue.ACCEPTED);
        });

        it('should return 400 if quoteId is missing', async () => {
            // Use util with incorrect type (empty object) - relies on controller validation
            const response = await createLesson(studentAuthToken!, {} as any);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing required field: quoteId');
        });

        it('should return 404 if quoteId does not exist', async () => {
            const fakeQuoteId = uuidv4();
            // Use util
            const response = await createLesson(studentAuthToken!, { quoteId: fakeQuoteId });
            expect(response.status).toBe(404);
        });

        it('should return 409 if quote is already used for another lesson', async () => {
            // Use util
            const response = await createLesson(studentAuthToken!, { quoteId: createdQuoteId! });
            expect(response.status).toBe(409);
            expect(response.body.error).toContain('already associated with lesson');
        });

        it('should return 401 if unauthenticated', async () => {
            // Use unauthenticated util
            const response = await createLessonUnauthenticated({ quoteId: anotherQuoteId });
            expect(response.status).toBe(401);
        });
    });

    // --- GET /lessons/:id --- 
    describe('GET /:id', () => {
        it('should return the lesson details for the associated student', async () => {
            // Use util
            const response = await getLessonById(studentAuthToken!, createdLessonId!); // Added non-null assertions
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdLessonId);
            expect(response.body.quote.lessonRequest.student.id).toBe(studentId);
        });

        it('should return the lesson details for the associated teacher', async () => {
            // Use util
            const response = await getLessonById(teacherAuthToken!, createdLessonId!); // Added non-null assertions
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdLessonId);
            expect(response.body.quote.teacher.id).toBe(teacherId);
        });

        it('should return 401 if unauthenticated', async () => {
            // Use unauthenticated util
            const response = await getLessonByIdUnauthenticated(createdLessonId!); // Added non-null assertion
            expect(response.status).toBe(401);
        });

        it('should return 404 if requested by an unrelated user', async () => {
            const { user: unrelated, password } = await createTestStudent();
            const unrelatedToken = await loginTestUser(unrelated.email, password, UserType.STUDENT);
            // Use util
            const response = await getLessonById(unrelatedToken, createdLessonId!); // Added non-null assertion
            expect(response.status).toBe(404);
        });

        it('should return 404 for a non-existent lesson ID', async () => {
            const fakeLessonId = uuidv4();
            // Use util
            const response = await getLessonById(teacherAuthToken!, fakeLessonId); // Added non-null assertion
            expect(response.status).toBe(404);
        });
    });

    // --- PATCH /lessons/:lessonId --- 
    describe('PATCH /:lessonId', () => {
        let lessonToPatchId: string;

        beforeAll(async () => {
            // Create a fresh lesson for patching
            const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            const lessonRequestData = await createTestLessonRequest(
                studentAuthToken!, studentId!, LessonType.GUITAR, futureDate, 60
            );
            const quoteData = { lessonRequestId: lessonRequestData.id, costInCents: 7000, hourlyRateInCents: 7000 };
            const quote = await createTestLessonQuote(teacherAuthToken!, quoteData);
            const lesson = await acceptTestLessonQuote(studentAuthToken!, quote.id);
            lessonToPatchId = lesson.id; // Lesson starts as ACCEPTED
        });

        it('should allow the teacher to update the lesson status (e.g., DEFINE)', async () => {
            const transition = LessonStatusTransition.DEFINE;
            // Use util
            const response = await updateLessonStatus(teacherAuthToken!, lessonToPatchId, { transition });
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(lessonToPatchId);
            expect(response.body.currentStatus.status).toBe(LessonStatusValue.DEFINED);
        });

        it('should allow the teacher to update the lesson status (e.g., COMPLETE)', async () => {
            // Ensure it's DEFINED first using util
            await updateLessonStatus(teacherAuthToken!, lessonToPatchId, { transition: LessonStatusTransition.DEFINE });

            const transition = LessonStatusTransition.COMPLETE;
            // Use util
            const response = await updateLessonStatus(teacherAuthToken!, lessonToPatchId, { transition });
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(lessonToPatchId);
            expect(response.body.currentStatus.status).toBe(LessonStatusValue.COMPLETED);
        });

        it('should return 400 for an invalid status transition', async () => {
            // Need a fresh ACCEPTED lesson
            const lessonRequestData = await createTestLessonRequest(studentAuthToken!, studentId!, LessonType.DRUMS);
            const quoteData = { lessonRequestId: lessonRequestData.id, costInCents: 7000, hourlyRateInCents: 7000 };
            const quote = await createTestLessonQuote(teacherAuthToken!, quoteData);
            const lesson = await acceptTestLessonQuote(studentAuthToken!, quote.id);
            const acceptedLessonId = lesson.id;

            // Use util
            const response = await updateLessonStatus(teacherAuthToken!, acceptedLessonId, { transition: LessonStatusTransition.COMPLETE });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid transition');
        });

        it('should return 400 if transition value is invalid', async () => {
            // Use patchLessonRaw util
            const response = await patchLessonRaw(teacherAuthToken!, lessonToPatchId, { transition: 'MAKE_IT_BREAK' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid transition value');
        });

        it('should return 400 if transition is missing', async () => {
            // Use patchLessonRaw util
            const response = await patchLessonRaw(teacherAuthToken!, lessonToPatchId, {});
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing required fields: lessonId or transition'); // Check specific Zod message if applicable
        });

        it('should return 401 if unauthenticated', async () => {
            // Use unauthenticated util
            const response = await updateLessonStatusUnauthenticated(lessonToPatchId, { transition: LessonStatusTransition.DEFINE });
            expect(response.status).toBe(401);
        });

        it('should return 403 if requested by the student', async () => {
            // Use util
            const response = await updateLessonStatus(studentAuthToken!, lessonToPatchId, { transition: LessonStatusTransition.DEFINE });
            expect(response.status).toBe(403);
        });

        it('should return 403 if requested by an unrelated teacher', async () => {
            const { user: otherTeacher, password } = await createTestTeacher();
            const otherTeacherToken = await loginTestUser(otherTeacher.email, password, UserType.TEACHER);
            // Use util
            const response = await updateLessonStatus(otherTeacherToken, lessonToPatchId, { transition: LessonStatusTransition.DEFINE });
            expect(response.status).toBe(403);
        });

        it('should return 404 for a non-existent lesson ID', async () => {
            const fakeLessonId = uuidv4();
            // Use util
            const response = await updateLessonStatus(teacherAuthToken!, fakeLessonId, { transition: LessonStatusTransition.DEFINE });
            expect(response.status).toBe(404);
        });
    });

});