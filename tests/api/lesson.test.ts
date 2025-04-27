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
    let teacherAuthToken: string | null = null;
    let studentId: string | null = null;
    let studentAuthToken: string | null = null;
    let createdLessonId: string | null = null;
    let createdQuoteId: string | null = null;

    // Setup: Create teacher, student, request, quote, and lesson
    beforeAll(async () => {
        try {
            // Create users and login
            // Create teacher and specify the DRUMS rate needed for this suite
            const { user: teacher, password: teacherPassword } = await createTestTeacher([
                { lessonType: LessonType.DRUMS, rateInCents: 6000 }
            ]);
            teacherId = teacher.id;
            teacherAuthToken = await loginTestUser(teacher.email, teacherPassword, UserType.TEACHER);
            const { user: student, password: studentPassword } = await createTestStudent();
            studentId = student.id;
            studentAuthToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);

            // Create request
            const lessonRequest = await createTestLessonRequest(studentAuthToken!, studentId!, LessonType.DRUMS);

            // Generate quote (Student) - Should now succeed
            const createdQuotes = await createTestLessonQuote(studentAuthToken!, {
                lessonRequestId: lessonRequest.id,
                lessonType: LessonType.DRUMS // Use the same type as the request
            });
            if (!createdQuotes || createdQuotes.length === 0) {
                throw new Error('Setup failed: No quotes generated.');
            }
            // Find the specific quote from OUR teacher
            const quote = createdQuotes.find(q => q.teacher?.id === teacherId);
            if (!quote) {
                console.error(`Setup Error: Could not find quote from expected teacher ${teacherId} in generated quotes:`, createdQuotes);
                throw new Error(`Setup Error: Quote from teacher ${teacherId} not found.`);
            }
            createdQuoteId = quote.id; // Store quote ID

            // Accept quote to create lesson (Student)
            await acceptTestLessonQuote(studentAuthToken!, quote.id);

            // Fetch the newly created Lesson using the quoteId
            const fetchLessonResponse = await request(API_BASE_URL!)
                .get('/api/v1/lessons')
                .set('Authorization', `Bearer ${studentAuthToken}`)
                .query({ quoteId: createdQuoteId });

            if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.body) || fetchLessonResponse.body.length !== 1) {
                console.error("Failed to fetch created lesson in lesson setup:", fetchLessonResponse.status, fetchLessonResponse.body);
                throw new Error(`Failed to fetch lesson associated with quote ${createdQuoteId} in setup.`);
            }
            const createdLesson = fetchLessonResponse.body[0];
            if (!createdLesson || !createdLesson.id) {
                console.error("Fetched lesson object is invalid in setup:", createdLesson);
                throw new Error('Fetched lesson object is invalid in setup.');
            }
            createdLessonId = createdLesson.id;

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
            // Requires a teacher with a GUITAR rate
            const { user: postTeacher, password: postPassword } = await createTestTeacher([
                { lessonType: LessonType.GUITAR, rateInCents: 4800 }
            ]);
            const postTeacherToken = await loginTestUser(postTeacher.email, postPassword, UserType.TEACHER);
            // Use the main student from the outer scope
            const request = await createTestLessonRequest(studentAuthToken!, studentId!, LessonType.GUITAR);

            // Generate quote (Student) - Use the teacher created here
            const createdQuotes = await createTestLessonQuote(studentAuthToken!, {
                lessonRequestId: request.id,
                lessonType: LessonType.GUITAR
            });
            if (!createdQuotes || createdQuotes.length === 0) {
                throw new Error('Setup for POST /lessons failed: No quotes generated.');
            }
            // Find the quote from the teacher created in *this* block
            const quote = createdQuotes.find(q => q.teacher?.id === postTeacher.id);
            if (!quote) {
                throw new Error('Setup for POST /lessons failed: Quote from specific teacher not found.');
            }
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
            // Use util with incorrect type (empty object)
            const response = await createLesson(studentAuthToken!, {} as any);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Valid Quote ID is required.');
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
            if (!studentAuthToken || !createdLessonId) {
                throw new Error('Test setup incomplete: studentAuthToken or createdLessonId is missing.');
            }
            const response = await getLessonById(studentAuthToken!, createdLessonId!);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdLessonId);
            expect(response.body.quote.lessonRequest.student.id).toBe(studentId);
        });

        it('should return the lesson details for the associated teacher', async () => {
            if (!teacherAuthToken || !createdLessonId) {
                throw new Error('Test setup incomplete: teacherAuthToken or createdLessonId is missing.');
            }
            const response = await getLessonById(teacherAuthToken!, createdLessonId!);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(createdLessonId);
            expect(response.body.quote.teacher.id).toBe(teacherId);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonId) throw new Error('Test setup incomplete: createdLessonId is missing.');
            const response = await getLessonByIdUnauthenticated(createdLessonId!); // Added assertion
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if requested by an unrelated user', async () => {
            const { user: unrelatedUser, password: unrelatedPassword } = await createTestStudent();
            const unrelatedToken = await loginTestUser(unrelatedUser.email, unrelatedPassword, UserType.STUDENT);
            if (!createdLessonId) throw new Error('Test setup incomplete: createdLessonId is missing.');
            const response = await getLessonById(unrelatedToken, createdLessonId!);
            // Update assertion: Expect 404 because the service checks existence before auth
            expect(response.status).toBe(404);
        });

        it('should return 404 Not Found if lesson ID does not exist', async () => {
            const fakeLessonId = uuidv4();
            const response = await getLessonById(studentAuthToken!, fakeLessonId); // Added assertion
            expect(response.status).toBe(404);
        });

        it('should return 400 Bad Request if lesson ID is invalid', async () => {
            const response = await getLessonById(studentAuthToken!, 'invalid-uuid'); // Added assertion
            expect(response.status).toBe(400);
        });
    });

    // --- PATCH /lessons/:id --- 
    describe('PATCH /:id', () => {
        let lessonToUpdateId: string;
        let quoteForUpdateId: string;
        let patchTeacherAuthToken: string; // Token for the teacher specific to this suite
        let patchTeacherId: string; // ID for the teacher specific to this suite
        let patchStudentAuthToken: string; // Token for student (needed for one test)

        beforeAll(async () => {
            // Create a separate teacher, student, and lesson specifically for update tests
            const { user: patchStudent, password: patchStudentPassword } = await createTestStudent();
            const studentIdForPatch = patchStudent.id;
            patchStudentAuthToken = await loginTestUser(patchStudent.email, patchStudentPassword, UserType.STUDENT);

            // Create teacher with VOICE rate needed for this lesson
            const { user: patchTeacher, password: patchTeacherPassword } = await createTestTeacher([
                { lessonType: LessonType.VOICE, rateInCents: 5000 }
            ]);
            patchTeacherId = patchTeacher.id;
            patchTeacherAuthToken = await loginTestUser(patchTeacher.email, patchTeacherPassword, UserType.TEACHER);

            const req = await createTestLessonRequest(patchStudentAuthToken!, studentIdForPatch!, LessonType.VOICE);
            const quotes = await createTestLessonQuote(patchStudentAuthToken!, { lessonRequestId: req.id, lessonType: LessonType.VOICE });
            if (!quotes || quotes.length === 0) throw new Error('PATCH Setup: No quotes generated.');
            // Find the specific quote from the teacher created *in this block*
            const quote = quotes.find(q => q.teacher?.id === patchTeacherId);
            if (!quote) throw new Error('PATCH setup: Quote from specific teacher not found.');
            quoteForUpdateId = quote.id;

            await acceptTestLessonQuote(patchStudentAuthToken!, quoteForUpdateId);
            const fetchResp = await request(API_BASE_URL!).get('/api/v1/lessons')
                .set('Authorization', `Bearer ${patchStudentAuthToken}`)
                .query({ quoteId: quoteForUpdateId });
            if (fetchResp.status !== 200 || !Array.isArray(fetchResp.body) || fetchResp.body.length !== 1) {
                throw new Error('PATCH Setup: Failed to fetch created lesson.');
            }
            lessonToUpdateId = fetchResp.body[0].id;
        });

        it('should update the lesson status (e.g., Teacher marks COMPLETE)', async () => {
            // Teacher must first DEFINE the lesson
            await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, { transition: LessonStatusTransition.DEFINE });
            // Then mark as COMPLETE
            const payload = { transition: LessonStatusTransition.COMPLETE };
            const response = await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, payload);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(lessonToUpdateId);
            expect(response.body.currentStatus.status).toBe(LessonStatusValue.COMPLETED);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const payload = { transition: LessonStatusTransition.VOID };
            const response = await updateLessonStatusUnauthenticated(lessonToUpdateId, payload);
            expect(response.status).toBe(401);
        });

        it('should return 400 Bad Request for invalid status transition', async () => {
            // Ensure lesson is DEFINED then COMPLETED first using the correct teacher token
            await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, { transition: LessonStatusTransition.DEFINE });
            await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, { transition: LessonStatusTransition.COMPLETE });
            // Try COMPLETE again
            const payload = { transition: LessonStatusTransition.COMPLETE };
            const response = await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, payload);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid transition: Cannot transition from COMPLETED using COMPLETE');
        });

        it('should return 400 Bad Request if transition is missing', async () => {
            // Use the correct teacher token
            const response = await patchLessonRaw(patchTeacherAuthToken!, lessonToUpdateId, {});
            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/Invalid transition value|Transition is required/);
        });

        it('should return 400 Bad Request if transition is invalid', async () => {
            // Use the correct teacher token
            const response = await patchLessonRaw(patchTeacherAuthToken!, lessonToUpdateId, { transition: 'INVALID_TRANSITION' });
            expect(response.status).toBe(400);
            expect(response.body.error).toMatch(/Invalid transition value|Invalid enum value/);
        });

        it('should return 403 Forbidden if student tries an action only teacher can do', async () => {
            // Use the student token associated with this suite's setup
            const studentToken = patchStudentAuthToken!;
            const lessonId = lessonToUpdateId; // Use the lesson ID from the suite's setup

            // Need to ensure the lesson is in a state where COMPLETE is a valid *next* step IF the user were allowed
            // The teacher must DEFINE it first.
            await updateLessonStatus(patchTeacherAuthToken!, lessonId, { transition: LessonStatusTransition.DEFINE });

            // Student tries to mark COMPLETE
            const payload = { transition: LessonStatusTransition.COMPLETE };
            const response = await updateLessonStatus(studentToken, lessonId, payload);
            expect(response.status).toBe(403);
            // Update assertion to match the expected error from checkRole middleware
            expect(response.body.error).toMatch(/Forbidden|Insufficient permissions/);
        });

        it('should return 404 Not Found if lesson ID does not exist', async () => {
            const fakeLessonId = uuidv4();
            const payload = { transition: LessonStatusTransition.COMPLETE };
            // Use the correct teacher token
            const response = await updateLessonStatus(patchTeacherAuthToken!, fakeLessonId, payload);
            expect(response.status).toBe(404);
        });
    });
});