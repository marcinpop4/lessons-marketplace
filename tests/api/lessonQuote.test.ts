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
import axios from 'axios'; // Import axios

// Import test utilities
import { createTestStudent, createTestTeacher, loginTestUser } from '../utils/user.utils';
import { createTestLessonRequest } from '../utils/lessonRequest.utils';
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
} from '../utils/lessonQuote.utils';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

describe('API Integration: /api/v1/lesson-quotes', () => {
    // Variables populated by beforeAll
    let studentAuthToken: string | null = null;
    let teacherAuthToken: string | null = null;
    let teacherId: string | null = null;
    let teacher2AuthToken: string | null = null;
    let teacher2Id: string | null = null;
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

            // Create a second teacher with a GUITAR rate
            const { user: teacher2, password: teacher2Password } = await createTestTeacher([
                { lessonType: LessonType.GUITAR, rateInCents: 4700 } // Different rate for variety
            ]);
            teacher2Id = teacher2.id;
            teacher2AuthToken = await loginTestUser(teacher2.email, teacher2Password, UserType.TEACHER);

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
        // Define base structure, specific tests will modify/use it
        let basePayload: { lessonRequestId: string | null; teacherIds?: string[] } = {
            lessonRequestId: null
        };

        beforeEach(() => {
            // Reset payload before each test within this describe block
            basePayload = { lessonRequestId: createdLessonRequestId };
        });

        it('should generate quotes for available teachers when no teacherIds are provided', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            if (!basePayload.lessonRequestId) throw new Error('Lesson Request ID not set in beforeEach');

            // Use the base payload (only lessonRequestId)
            const response = await createQuote(studentAuthToken, basePayload as { lessonRequestId: string });

            expect(response.status).toBe(201);
            const quotes: LessonQuote[] = response.data; // Use response.data
            expect(Array.isArray(quotes)).toBe(true);
            expect(quotes.length).toBeGreaterThanOrEqual(1); // Expect at least one quote
            // Ensure the quotes are for the correct request
            expect(quotes[0].lessonRequest?.id).toEqual(basePayload.lessonRequestId);
            // We can't know *which* teacher quoted, but check structure
            expect(quotes[0].teacher?.id).toBeDefined();
            expect(quotes[0].currentStatus?.status).toEqual(LessonQuoteStatusValue.CREATED);
        }, 20000); // Keep timeout from original test

        it('should generate quotes ONLY for specified teachers when teacherIds are provided', async () => {
            if (!studentAuthToken || !teacherId || !teacher2Id) throw new Error('Test setup vars missing');
            if (!basePayload.lessonRequestId) throw new Error('Lesson Request ID not set in beforeEach');

            const payload = { ...basePayload, teacherIds: [teacherId, teacher2Id] };
            const response = await createQuote(studentAuthToken, payload as { lessonRequestId: string; teacherIds: string[] });

            expect(response.status).toBe(201);
            const quotes: LessonQuote[] = response.data; // Use response.data
            expect(Array.isArray(quotes)).toBe(true);
            expect(quotes.length).toBe(2); // Expect exactly two quotes

            const receivedTeacherIds = quotes.map((q: LessonQuote) => q.teacher?.id);
            expect(receivedTeacherIds).toHaveLength(2);
            expect(receivedTeacherIds).toContain(teacherId);
            expect(receivedTeacherIds).toContain(teacher2Id);
        });

        it('should return 400 Bad Request if teacherIds is not an array', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const payload = { ...basePayload, teacherIds: 'not-an-array' };
            try {
                // Use axios directly as createQuote expects specific type
                await axios.post(`${API_BASE_URL}/api/v1/lesson-quotes`, payload, {
                    headers: { 'Authorization': `Bearer ${studentAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('teacherIds must be an array if provided');
            }
        });

        it('should return 400 Bad Request if teacherIds contains invalid UUIDs', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const payload = { ...basePayload, teacherIds: [teacherId!, 'invalid-uuid'] };
            try {
                await createQuote(studentAuthToken, payload as { lessonRequestId: string; teacherIds: string[] });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Invalid Teacher UUIDs provided');
            }
        });

        it('should return 400 Bad Request if teacherIds is an empty array', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const payload = { ...basePayload, teacherIds: [] };
            try {
                await createQuote(studentAuthToken, payload as { lessonRequestId: string; teacherIds: string[] });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('teacherIds cannot be an empty array');
            }
        });

        // --- Keep existing tests ---
        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await createQuoteUnauthenticated(basePayload as { lessonRequestId: string });
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if requested by a Teacher', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token not available');
            try {
                await createQuote(teacherAuthToken, basePayload as { lessonRequestId: string });
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
            }
        });

        it('should return 400 Bad Request if lessonRequestId is missing', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const { lessonRequestId, ...invalidPayload } = basePayload;
            try {
                await createQuote(studentAuthToken, invalidPayload as any);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Valid Lesson Request ID is required.');
            }
        });

        it('should return 404 Not Found if lesson request ID does not exist', async () => {
            if (!studentAuthToken) throw new Error('Student token not available');
            const fakeRequestId = uuidv4();
            try {
                await createQuote(studentAuthToken, { lessonRequestId: fakeRequestId });
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });
    });

    describe('GET /', () => {
        let quoteIdForGetTests: string;

        beforeEach(async () => {
            if (!studentAuthToken || !createdLessonRequestId) {
                throw new Error('Setup failed: Student token or Lesson Request ID missing for GET suite beforeEach');
            }
            // Ensure teacherId from outer scope is available
            if (!teacherId) {
                throw new Error('Setup failed: teacherId not available for GET suite beforeEach');
            }
            // This should now work as the teacher created in the outer beforeAll has a GUITAR rate
            const quotes = await createTestLessonQuote(studentAuthToken, {
                lessonRequestId: createdLessonRequestId,
                teacherIds: [teacherId]
            });
            if (!quotes || quotes.length === 0) {
                throw new Error('GET suite beforeEach: Failed to generate quotes.');
            }
            quoteIdForGetTests = quotes[0].id;
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!createdLessonRequestId) throw new Error('Lesson Request ID not available');
            try {
                await getQuotesByLessonRequestIdUnauthenticated(createdLessonRequestId);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return quotes for the specific lesson request when queried by STUDENT', async () => {
            if (!studentAuthToken || !createdLessonRequestId || !quoteIdForGetTests) throw new Error('Auth token, Lesson Request ID, or Quote ID for GET test not available');
            const response = await getQuotesByLessonRequestId(studentAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            const quotes: LessonQuote[] = response.data; // Use response.data
            expect(quotes).toBeInstanceOf(Array);
            expect(quotes.length).toBeGreaterThan(0);
            const foundQuote = quotes.find((q: LessonQuote) => q.id === quoteIdForGetTests);
            expect(foundQuote).toBeDefined();
            expect(foundQuote!.lessonRequest?.id).toEqual(createdLessonRequestId);
            // Can't easily assert teacherId as it depends on who was available
            expect(foundQuote!.teacher?.id).toBeDefined();
        });

        it('should return quotes for the specific lesson request when queried by TEACHER', async () => {
            if (!teacherAuthToken || !createdLessonRequestId || !quoteIdForGetTests) throw new Error('Auth token, Lesson Request ID, or Quote ID for GET test not available');
            const response = await getQuotesByLessonRequestId(teacherAuthToken, createdLessonRequestId);

            expect(response.status).toBe(200);
            const quotes: LessonQuote[] = response.data; // Use response.data
            expect(quotes).toBeInstanceOf(Array);
            expect(quotes.length).toBeGreaterThan(0);
            const foundQuote = quotes.find((q: LessonQuote) => q.id === quoteIdForGetTests);
            expect(foundQuote).toBeDefined();
        });

        it('should return 400 Bad Request if lessonRequestId query parameter is missing', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');
            try {
                await axios.get(`${API_BASE_URL}/api/v1/lesson-quotes`, { // No query
                    headers: { 'Authorization': `Bearer ${studentAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('lessonRequestId query parameter is required');
            }
        });

        it('should return 404 Not Found for a non-existent lesson request ID in query param', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available for test');
            const fakeRequestId = uuidv4();
            try {
                await getQuotesByLessonRequestId(studentAuthToken, fakeRequestId);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.error).toContain(`Lesson request with ID ${fakeRequestId} not found.`);
            }
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
                    teacherIds: [patchTeacherId]
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
            const quote: LessonQuote = response.data; // Use response.data
            expect(quote.id).toBe(quoteToAcceptId);
            expect(quote.currentStatus?.status).toBe(LessonQuoteStatusValue.ACCEPTED);
            // TODO: Add check that a Lesson was created? (Requires fetching lesson by quoteId)
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            try {
                await updateQuoteStatusUnauthenticated(quoteToAcceptId, payload);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if the TEACHER tries to accept the quote', async () => {
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            try {
                // Use local teacher token
                await updateQuoteStatus(patchTeacherToken, quoteToAcceptId, payload);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
            }
        });

        it('should return 403 Forbidden if an unrelated STUDENT tries to accept the quote', async () => {
            // Use the student token from the outer scope (different from the local one)
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            try {
                await updateQuoteStatus(studentAuthToken!, quoteToAcceptId, payload);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
            }
        });

        it('should return 400 Bad Request for an invalid status transition (e.g., ACCEPTED -> CREATED)', async () => {
            await updateQuoteStatus(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.ACCEPTED });
            try {
                await patchQuoteRaw(patchStudentToken, quoteToAcceptId, { status: LessonQuoteStatusValue.CREATED });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Invalid target status');
            }
        });

        it('should return 400 Bad Request if status is missing', async () => {
            try {
                await patchQuoteRaw(patchStudentToken, quoteToAcceptId, {}); // Empty payload
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
            }
        });

        it('should return 400 Bad Request if status value is invalid', async () => {
            try {
                await patchQuoteRaw(patchStudentToken, quoteToAcceptId, { status: 'INVALID_STATUS' });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
            }
        });

        it('should return 404 Not Found if quote ID does not exist', async () => {
            const fakeQuoteId = uuidv4();
            const payload = { status: LessonQuoteStatusValue.ACCEPTED };
            try {
                await updateQuoteStatus(patchStudentToken, fakeQuoteId, payload);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });
    });
}); 