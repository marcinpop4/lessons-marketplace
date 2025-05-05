import { Lesson } from '../../shared/models/Lesson';
import { LessonStatusValue, LessonStatusTransition } from '../../shared/models/LessonStatus';
import { UserType } from '../../shared/models/UserType'; // Import UserType
import { LessonType } from '../../shared/models/LessonType'; // Import LessonType
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import axios from 'axios'; // Import axios

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
                teacherIds: [teacherId!] // Specify the teacher ID
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

            // Fetch the newly created Lesson using the quoteId (using axios)
            let createdLesson: Lesson;
            try {
                const fetchLessonResponse = await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${studentAuthToken}` },
                    params: { quoteId: createdQuoteId }
                });

                if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.data) || fetchLessonResponse.data.length !== 1) {
                    console.error("Failed to fetch created lesson in lesson setup:", fetchLessonResponse.status, fetchLessonResponse.data);
                    throw new Error(`Failed to fetch lesson associated with quote ${createdQuoteId} in setup.`);
                }
                createdLesson = fetchLessonResponse.data[0] as Lesson;
                if (!createdLesson || !createdLesson.id) {
                    console.error("Fetched lesson object is invalid in setup:", createdLesson);
                    throw new Error('Fetched lesson object is invalid in setup.');
                }
                createdLessonId = createdLesson.id;
            } catch (error: any) {
                console.error("Error fetching lesson in beforeAll:", axios.isAxiosError(error) ? error.response?.data : error);
                throw new Error(`Failed to fetch lesson associated with quote ${createdQuoteId} in setup: ${error.message}`);
            }

        } catch (error) {
            console.error('[Lesson Test Setup Error]', error);
            throw error;
        }
    }, 60000);

    // --- GET /lessons (Combined Filters) ---
    describe('GET /lessons (Combined Filters)', () => {

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use unauthenticated util
            try {
                await getLessonsUnauthenticated({ teacherId: teacherId! });
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 400 Bad Request if NEITHER teacherId NOR quoteId is provided', async () => {
            try {
                await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${teacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Exactly one of teacherId or quoteId');
            }
        });

        it('should return 400 Bad Request if BOTH teacherId AND quoteId are provided', async () => {
            try {
                await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${teacherAuthToken}` },
                    params: { teacherId: teacherId!, quoteId: createdQuoteId! }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Exactly one of teacherId or quoteId');
            }
        });

        // --- Tests for teacherId filter ---
        describe('using ?teacherId=...', () => {
            it('should return 403 Forbidden if requesting as the wrong role (STUDENT)', async () => {
                try {
                    await getLessons(studentAuthToken!, { teacherId: teacherId! });
                    throw new Error('Request should have failed with 403');
                } catch (error: any) {
                    expect(axios.isAxiosError(error)).toBe(true);
                    expect(error.response?.status).toBe(403);
                    expect(error.response?.data?.error).toContain('Only teachers can filter by teacherId');
                }
            });

            it('should return 403 Forbidden if requesting lessons for a different teacher ID', async () => {
                const otherTeacherId = 'some-other-teacher-id-not-created';
                try {
                    await getLessons(teacherAuthToken!, { teacherId: otherTeacherId });
                    throw new Error('Request should have failed with 403');
                } catch (error: any) {
                    expect(axios.isAxiosError(error)).toBe(true);
                    expect(error.response?.status).toBe(403);
                    expect(error.response?.data?.error).toContain('Teachers can only retrieve their own lessons');
                }
            });

            it('should return lessons for the authenticated teacher', async () => {
                // Use util
                const response = await getLessons(teacherAuthToken!, { teacherId: teacherId! });
                expect(response.status).toBe(200);
                const lessons: Lesson[] = response.data; // Use response.data
                expect(lessons).toBeInstanceOf(Array);
                expect(lessons.length).toBeGreaterThan(0);
                const foundLesson = lessons.find((l: Lesson) => l.id === createdLessonId);
                expect(foundLesson).toBeDefined();
                expect(foundLesson!.quote?.teacher?.id).toEqual(teacherId);
            });
        });

        // --- Tests for quoteId filter ---
        describe('using ?quoteId=...', () => {
            it('should return lessons for the TEACHER associated with the quote', async () => {
                // Use util
                const response = await getLessons(teacherAuthToken!, { quoteId: createdQuoteId! });
                expect(response.status).toBe(200);
                const lessons: Lesson[] = response.data; // Use response.data
                expect(lessons).toBeInstanceOf(Array);
                expect(lessons.length).toBeGreaterThan(0);
                const foundLesson = lessons.find((l: Lesson) => l.id === createdLessonId);
                expect(foundLesson).toBeDefined();
                expect(foundLesson!.quote?.id).toEqual(createdQuoteId);
            });

            it('should return lessons for the STUDENT associated with the quote', async () => {
                // Use util
                const response = await getLessons(studentAuthToken!, { quoteId: createdQuoteId! });
                expect(response.status).toBe(200);
                const lessons: Lesson[] = response.data; // Use response.data
                expect(lessons).toBeInstanceOf(Array);
                expect(lessons.length).toBeGreaterThan(0);
                const foundLesson = lessons.find((l: Lesson) => l.id === createdLessonId);
                expect(foundLesson).toBeDefined();
                expect(foundLesson!.quote?.id).toEqual(createdQuoteId);
            });

            it('should return 403 Forbidden for an unrelated user', async () => {
                // Create a third user (another student)
                const { user: otherStudent, password: otherPassword } = await createTestStudent();
                const otherToken = await loginTestUser(otherStudent.email, otherPassword, UserType.STUDENT);

                try {
                    await getLessons(otherToken, { quoteId: createdQuoteId! });
                    throw new Error('Request should have failed with 403');
                } catch (error: any) {
                    expect(axios.isAxiosError(error)).toBe(true);
                    expect(error.response?.status).toBe(403);
                    expect(error.response?.data?.error).toContain('User is not authorized to view lessons for this quote');
                }
            });

            it('should return empty array for a non-existent quoteId', async () => {
                const fakeQuoteId = uuidv4();
                // Use util
                const response = await getLessons(teacherAuthToken!, { quoteId: fakeQuoteId });
                expect(response.status).toBe(200);
                const lessons: Lesson[] = response.data; // Use response.data
                expect(lessons).toBeInstanceOf(Array);
                expect(lessons.length).toBe(0);
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
            // No need for postTeacherToken
            // Use the main student from the outer scope
            const request = await createTestLessonRequest(studentAuthToken!, studentId!, LessonType.GUITAR);

            // Generate quote (Student) - Use the teacher created here
            const createdQuotes = await createTestLessonQuote(studentAuthToken!, {
                lessonRequestId: request.id,
                teacherIds: [postTeacher.id] // Specify the teacher ID
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
            const createdLesson: Lesson = response.data; // Use response.data
            expect(createdLesson.id).toBeDefined();
            expect(createdLesson.quote.id).toBe(anotherQuoteId);
            expect(createdLesson.currentStatus?.status).toBe(LessonStatusValue.REQUESTED);
        });

        it('should return 400 if quoteId is missing', async () => {
            try {
                // Use util with incorrect type (empty object)
                await createLesson(studentAuthToken!, {} as any);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Valid Quote ID is required.');
            }
        });

        it('should return 404 if quoteId does not exist', async () => {
            const fakeQuoteId = uuidv4();
            try {
                await createLesson(studentAuthToken!, { quoteId: fakeQuoteId });
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });

        it('should return 409 if quote is already used for another lesson', async () => {
            try {
                // Use util
                await createLesson(studentAuthToken!, { quoteId: createdQuoteId! });
                throw new Error('Request should have failed with 409');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(409);
                expect(error.response?.data?.error).toContain('already associated with lesson');
            }
        });

        it('should return 401 if unauthenticated', async () => {
            try {
                // Use unauthenticated util
                await createLessonUnauthenticated({ quoteId: anotherQuoteId });
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });
    });

    // --- GET /lessons/:id ---
    describe('GET /:id', () => {
        it('should return the lesson details for the associated student', async () => {
            if (!studentAuthToken || !createdLessonId) {
                throw new Error('Test setup incomplete: studentAuthToken or createdLessonId is missing.');
            }
            const response = await getLessonById(studentAuthToken!, createdLessonId!); // Use util
            expect(response.status).toBe(200);
            const lesson: Lesson = response.data; // Use response.data
            expect(lesson.id).toBe(createdLessonId);
            expect(lesson.quote.lessonRequest.student.id).toBe(studentId);
        });

        it('should return the lesson details for the associated teacher', async () => {
            if (!teacherAuthToken || !createdLessonId) {
                throw new Error('Test setup incomplete: teacherAuthToken or createdLessonId is missing.');
            }
            const response = await getLessonById(teacherAuthToken!, createdLessonId!); // Use util
            expect(response.status).toBe(200);
            const lesson: Lesson = response.data; // Use response.data
            expect(lesson.id).toBe(createdLessonId);
            expect(lesson.quote.teacher.id).toBe(teacherId);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonId) throw new Error('Test setup incomplete: createdLessonId is missing.');
            try {
                await getLessonByIdUnauthenticated(createdLessonId!); // Use util
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403/404 Forbidden/Not Found if requested by an unrelated user', async () => {
            const { user: unrelatedUser, password: unrelatedPassword } = await createTestStudent();
            const unrelatedToken = await loginTestUser(unrelatedUser.email, unrelatedPassword, UserType.STUDENT);
            if (!createdLessonId) throw new Error('Test setup incomplete: createdLessonId is missing.');
            try {
                await getLessonById(unrelatedToken, createdLessonId!); // Use util
                throw new Error('Request should have failed with 403/404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404); // Expect 404 based on service logic
            }
        });

        it('should return 404 Not Found if lesson ID does not exist', async () => {
            const fakeLessonId = uuidv4();
            try {
                await getLessonById(studentAuthToken!, fakeLessonId); // Use util
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });

        it('should return 400 Bad Request if lesson ID is invalid', async () => {
            try {
                await getLessonById(studentAuthToken!, 'invalid-uuid'); // Use util
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
            }
        });
    });

    // --- PATCH /lessons/:id ---
    describe('PATCH /:id', () => {
        let lessonToUpdateId: string;
        let quoteForUpdateId: string;
        let patchTeacherAuthToken: string; // Token for the teacher specific to this suite
        let patchTeacherId: string; // ID for the teacher specific to this suite
        let patchStudentAuthToken: string; // Token for student (needed for one test)

        // Use beforeEach to create a fresh lesson for each test in this suite
        beforeEach(async () => {
            try {
                // Create a separate teacher, student, and lesson specifically for update tests
                // Student
                const { user: patchStudent, password: patchStudentPassword } = await createTestStudent();
                const studentIdForPatch = patchStudent.id;
                patchStudentAuthToken = await loginTestUser(patchStudent.email, patchStudentPassword, UserType.STUDENT);

                // Teacher with VOICE rate
                const { user: patchTeacher, password: patchTeacherPassword } = await createTestTeacher([
                    { lessonType: LessonType.VOICE, rateInCents: 5000 }
                ]);
                patchTeacherId = patchTeacher.id;
                patchTeacherAuthToken = await loginTestUser(patchTeacher.email, patchTeacherPassword, UserType.TEACHER);

                // Request
                const req = await createTestLessonRequest(patchStudentAuthToken!, studentIdForPatch!, LessonType.VOICE);

                // Quote
                const quotes = await createTestLessonQuote(patchStudentAuthToken!, { lessonRequestId: req.id, teacherIds: [patchTeacherId] });
                if (!quotes || quotes.length === 0) throw new Error('PATCH beforeEach: No quotes generated.');
                const quote = quotes.find(q => q.teacher?.id === patchTeacherId);
                if (!quote) throw new Error('PATCH beforeEach: Quote from specific teacher not found.');
                quoteForUpdateId = quote.id; // Store quote ID if needed, though maybe not used directly in tests

                // Accept Quote (creates Lesson implicitly)
                await acceptTestLessonQuote(patchStudentAuthToken!, quoteForUpdateId);

                // Fetch the newly created Lesson ID
                const fetchResp = await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${patchStudentAuthToken}` },
                    params: { quoteId: quoteForUpdateId }
                });
                if (fetchResp.status !== 200 || !Array.isArray(fetchResp.data) || fetchResp.data.length !== 1) {
                    throw new Error('PATCH beforeEach: Failed to fetch created lesson.');
                }
                lessonToUpdateId = fetchResp.data[0].id; // Assign the ID for the current test
            } catch (error: any) {
                console.error("Error in PATCH /:id beforeEach:", axios.isAxiosError(error) ? error.response?.data : error);
                throw new Error(`PATCH beforeEach Failed: ${error.message}`);
            }
        });

        it('should update the lesson status (e.g., Teacher marks COMPLETE)', async () => {
            // Lesson is now guaranteed to be in REQUESTED state initially
            // Follow the valid transition path: REQUESTED -> ACCEPTED -> DEFINED -> COMPLETED

            // Step 1: ACCEPT (Teacher Action - assuming roles allow this for testing)
            await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, { transition: LessonStatusTransition.ACCEPT });

            // Step 2: DEFINE (Teacher Action)
            await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, { transition: LessonStatusTransition.DEFINE });

            // Step 3: COMPLETE (Teacher Action)
            const payload = { transition: LessonStatusTransition.COMPLETE };
            const response = await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, payload); // Use util
            expect(response.status).toBe(200);
            const updatedLesson: Lesson = response.data; // Use response.data
            expect(updatedLesson.id).toBe(lessonToUpdateId);
            expect(updatedLesson.currentStatus?.status).toBe(LessonStatusValue.COMPLETED); // Optional chaining kept
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const payload = { transition: LessonStatusTransition.VOID };
            try {
                await updateLessonStatusUnauthenticated(lessonToUpdateId, payload); // Use util
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 400 Bad Request for invalid status transition', async () => {
            // Lesson starts in REQUESTED state due to beforeEach

            // Try an invalid transition directly: REQUESTED -> COMPLETE
            const payload = { transition: LessonStatusTransition.COMPLETE };
            try {
                await updateLessonStatus(patchTeacherAuthToken!, lessonToUpdateId, payload); // Use util
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                // Updated expectation for the specific invalid transition from REQUESTED
                expect(error.response?.data?.error).toContain('Invalid transition: Cannot transition from REQUESTED using COMPLETE');
            }
        });

        it('should return 400 Bad Request if transition is missing', async () => {
            try {
                // Use the correct teacher token
                await patchLessonRaw(patchTeacherAuthToken!, lessonToUpdateId, {}); // Use util
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toMatch(/Invalid transition value|Transition is required/);
            }
        });

        it('should return 400 Bad Request if transition is invalid', async () => {
            try {
                // Use the correct teacher token
                await patchLessonRaw(patchTeacherAuthToken!, lessonToUpdateId, { transition: 'INVALID_TRANSITION' }); // Use util
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toMatch(/Invalid transition value|Invalid enum value/);
            }
        });

        it('should return 403 Forbidden if student tries an action only teacher can do', async () => {
            // Use the student token associated with this suite's setup
            const studentToken = patchStudentAuthToken!;
            const lessonId = lessonToUpdateId; // Use the lesson ID from the suite's setup

            // Lesson starts in REQUESTED state. Student tries to ACCEPT (which might be allowed)
            // Let's test a transition only a teacher can do, e.g., DEFINE
            // First, get it to ACCEPTED state (can be done by student or teacher usually)
            await updateLessonStatus(patchTeacherAuthToken!, lessonId, { transition: LessonStatusTransition.ACCEPT }); // Use teacher for setup

            // Now, student tries to DEFINE (Teacher-only action)
            const payload = { transition: LessonStatusTransition.DEFINE };
            try {
                await updateLessonStatus(studentToken, lessonId, payload); // Use util
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                // Update assertion to match the expected error from checkRole middleware
                expect(error.response?.data?.error).toMatch(/Forbidden|Insufficient permissions/);
            }
        });

        it('should return 404 Not Found if lesson ID does not exist', async () => {
            const fakeLessonId = uuidv4();
            const payload = { transition: LessonStatusTransition.COMPLETE };
            try {
                // Use the correct teacher token
                await updateLessonStatus(patchTeacherAuthToken!, fakeLessonId, payload); // Use util
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });
    });
});