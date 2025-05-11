import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Shared Models
import { Lesson } from '@shared/models/Lesson';
import { LessonType } from '@shared/models/LessonType';
import { Person as User } from '@shared/models/Person';
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { UserType } from '@shared/models/UserType';
import { LessonSummary } from '@shared/models/LessonSummary';
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';


// DTOs
import { CreateLessonSummaryDto } from '../../server/lessonSummary/lessonSummary.dto.js';

// Test Utilities
import { createTestStudent, createTestTeacher, loginTestUser } from '../utils/user.utils';
import { createTestLessonRequest } from '../utils/lessonRequest.utils';
import { createTestLessonQuote, acceptTestLessonQuote } from '../utils/lessonQuote.utils';
import { getLessons, updateLessonStatus } from '../utils/lesson.utils'; // createLesson is for accepting quote
import { createLessonSummary } from '../utils/lessonSummary.utils';

// Environment Variables
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

describe('API Integration: /api/v1/summary', () => {
    let teacher: User;
    let student: User;
    let teacherToken: string;
    let studentToken: string;
    let completedLesson: Lesson;
    let anotherCompletedLesson: Lesson; // For testing "summary already exists"

    beforeAll(async () => {
        try {
            // 1. Create users
            const teacherCredentials = await createTestTeacher([
                { lessonType: LessonType.GUITAR, rateInCents: 5000 },
                { lessonType: LessonType.VOICE, rateInCents: 5500 },
                { lessonType: LessonType.DRUMS, rateInCents: 6000 },
            ]);
            teacher = teacherCredentials.user;
            const studentCredentials = await createTestStudent();
            student = studentCredentials.user;

            // 2. Login users
            teacherToken = await loginTestUser(teacherCredentials.user.email, teacherCredentials.password, UserType.TEACHER);
            studentToken = await loginTestUser(studentCredentials.user.email, studentCredentials.password, UserType.STUDENT);

            // Function to create a completed lesson
            const setupCompletedLesson = async (lessonType: LessonType = LessonType.GUITAR): Promise<Lesson> => {
                // 3. Student creates a lesson request
                const lessonRequest: LessonRequest = await createTestLessonRequest(studentToken, student.id, lessonType);

                // 4. Student creates a lesson quote for the teacher
                // createTestLessonQuote returns an array, we expect one for the specified teacher
                const quotes: LessonQuote[] = await createTestLessonQuote(studentToken, {
                    lessonRequestId: lessonRequest.id,
                    teacherIds: [teacher.id]
                });
                if (!quotes || quotes.length === 0) {
                    throw new Error('Test setup failed: No quotes generated.');
                }
                const quoteToAccept = quotes.find(q => q.teacher.id === teacher.id);
                if (!quoteToAccept) {
                    throw new Error(`Test setup failed: Could not find quote from teacher ${teacher.id}.`);
                }

                // 5. Student accepts the quote (this creates the lesson, usually in ACCEPTED status)
                await acceptTestLessonQuote(studentToken, quoteToAccept.id);

                // 6. Get the created lesson's ID
                // The lesson is created when a quote is accepted. We fetch it by quoteId.
                const lessonResponse = await getLessons(teacherToken, { quoteId: quoteToAccept.id });
                if (lessonResponse.status !== 200 || !Array.isArray(lessonResponse.data) || lessonResponse.data.length === 0) {
                    console.error("Failed to fetch lesson by quoteId in setup:", lessonResponse.status, lessonResponse.data);
                    throw new Error(`Failed to fetch lesson by quoteId ${quoteToAccept.id}`);
                }
                let lessonToComplete = lessonResponse.data[0];


                // 7. Teacher updates the lesson status to COMPLETED
                // Step 7.1: Transition from REQUESTED to ACCEPTED (if needed)
                if (lessonToComplete.currentStatus?.status === LessonStatusValue.REQUESTED) {
                    const acceptedResponse = await updateLessonStatus(teacherToken, lessonToComplete.id, {
                        transition: LessonStatusTransition.ACCEPT
                    });
                    if (acceptedResponse.status !== 200 || acceptedResponse.data.currentStatus?.status !== LessonStatusValue.ACCEPTED) {
                        console.error("Failed to update lesson to ACCEPTED:", acceptedResponse.status, acceptedResponse.data);
                        throw new Error(`Failed to update lesson ${lessonToComplete.id} to ACCEPTED. Current status: ${acceptedResponse.data.currentStatus?.status}`);
                    }
                    lessonToComplete = acceptedResponse.data;
                }

                // Step 7.2: Transition from ACCEPTED to COMPLETED (if needed)
                if (lessonToComplete.currentStatus?.status === LessonStatusValue.ACCEPTED) {
                    const completedResponse = await updateLessonStatus(teacherToken, lessonToComplete.id, {
                        transition: LessonStatusTransition.COMPLETE
                    });
                    if (completedResponse.status !== 200 || completedResponse.data.currentStatus?.status !== LessonStatusValue.COMPLETED) {
                        console.error("Failed to update lesson to COMPLETED:", completedResponse.status, completedResponse.data);
                        throw new Error(`Failed to update lesson ${lessonToComplete.id} to COMPLETED. Current status: ${completedResponse.data.currentStatus?.status}`);
                    }
                    lessonToComplete = completedResponse.data;
                }

                // Final check if lesson is completed
                if (lessonToComplete.currentStatus?.status !== LessonStatusValue.COMPLETED) {
                    throw new Error(`Lesson ${lessonToComplete.id} is not COMPLETED after transitions. Final status: ${lessonToComplete.currentStatus?.status}`);
                }

                return lessonToComplete;
            };

            completedLesson = await setupCompletedLesson(LessonType.GUITAR);
            anotherCompletedLesson = await setupCompletedLesson(LessonType.DRUMS);

            if (!completedLesson || !completedLesson.id || completedLesson.currentStatus?.status !== LessonStatusValue.COMPLETED) {
                throw new Error('Test setup failed: Could not create a completed lesson.');
            }
            if (!anotherCompletedLesson || !anotherCompletedLesson.id || anotherCompletedLesson.currentStatus?.status !== LessonStatusValue.COMPLETED) {
                throw new Error('Test setup failed: Could not create another completed lesson for testing.');
            }

        } catch (error) {
            console.error('Error in beforeAll setup for LessonSummary tests:', error);
            // To see more details if axios error
            if (axios.isAxiosError(error) && error.response) {
                console.error('Axios error response:', error.response.data);
            }
            throw error; // Re-throw to fail the test suite
        }
    }, 90000); // Increased timeout for comprehensive setup

    describe('POST / (Create Lesson Summary)', () => {
        it('should create a lesson summary successfully for a completed lesson by the teacher', async () => {
            const summaryData: CreateLessonSummaryDto = {
                lessonId: completedLesson.id,
                summary: 'This was an excellent lesson covering major scales and chord progressions.',
                homework: 'Practice the C major scale and the I-V-vi-IV progression in G major for 1 hour.',
            };

            const response = await createLessonSummary(teacherToken, summaryData);

            expect(response.status).toBe(201);
            expect(response.data).toBeDefined();
            expect(response.data.id).toBeDefined();
            expect(response.data.lessonId).toBe(summaryData.lessonId);
            expect(response.data.summary).toBe(summaryData.summary);
            expect(response.data.homework).toBe(summaryData.homework);
            expect(response.data.createdAt).toBeDefined();
            expect(response.data.updatedAt).toBeDefined();
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const summaryData: CreateLessonSummaryDto = {
                lessonId: completedLesson.id,
                summary: 'Attempting to create with no auth.',
                homework: 'This should fail.',
            };
            try {
                // Attempt to call createLessonSummary without a token or with an invalid one
                // The createLessonSummary utility always takes a token, so we call axios directly.
                await axios.post(`${API_BASE_URL}/api/v1/summary`, summaryData);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if a student attempts to create a summary', async () => {
            const summaryData: CreateLessonSummaryDto = {
                lessonId: completedLesson.id,
                summary: 'Student trying to create a summary.',
                homework: 'Student homework attempt.',
            };
            try {
                await createLessonSummary(studentToken, summaryData); // Use student token
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
            }
        });

        describe('Validation (400 Bad Request)', () => {
            // Define baseValidData inside the test.each to ensure completedLesson is defined
            test.each([
                ['lessonId is missing', (id: string) => ({ lessonId: undefined, summary: 'Valid summary', homework: 'Valid homework' })],
                ['summary is missing', (id: string) => ({ lessonId: id, summary: undefined, homework: 'Valid homework' })],
                ['homework is missing', (id: string) => ({ lessonId: id, summary: 'Valid summary', homework: undefined })],
                ['lessonId is not a UUID', (id: string) => ({ lessonId: 'not-a-uuid', summary: 'Valid summary', homework: 'Valid homework' })],
                ['summary is too short', (id: string) => ({ lessonId: id, summary: 'short', homework: 'Valid homework' })],
                ['homework is too short', (id: string) => ({ lessonId: id, homework: 'tiny', summary: 'Valid summary' })],
            ])('should return 400 Bad Request if %s', async (description, getData) => {
                const data = getData(completedLesson.id);
                try {
                    await createLessonSummary(teacherToken, data as CreateLessonSummaryDto);
                    throw new Error(`Request should have failed with 400 for: ${description}`);
                } catch (error: any) {
                    expect(axios.isAxiosError(error)).toBe(true);
                    expect(error.response?.status).toBe(400);
                    // Optionally, assert specific error messages from response.data.message or response.data.errors
                }
            });
        });

        it('should return 404 Not Found if lessonId does not exist', async () => {
            const nonExistentLessonId = uuidv4();
            const summaryData: CreateLessonSummaryDto = {
                lessonId: nonExistentLessonId,
                summary: 'Summary for a lesson that does not exist.',
                homework: 'Homework for a non-existent lesson.',
            };
            try {
                await createLessonSummary(teacherToken, summaryData);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });

        it('should return 400 Bad Request if a summary already exists for the lesson', async () => {
            // Use `anotherCompletedLesson` which should be fresh for this test.
            const firstSummaryData: CreateLessonSummaryDto = {
                lessonId: anotherCompletedLesson.id,
                summary: 'Initial summary for duplication test.',
                homework: 'Initial homework for duplication test.',
            };
            // Create the first summary successfully
            const firstResponse = await createLessonSummary(teacherToken, firstSummaryData);
            expect(firstResponse.status).toBe(201);

            // Attempt to create another summary for the same lesson
            const duplicateSummaryData: CreateLessonSummaryDto = {
                lessonId: anotherCompletedLesson.id, // Same lessonId
                summary: 'Attempting to create a second summary for this lesson.',
                homework: 'This homework should not be saved as it is a duplicate attempt.',
            };
            try {
                await createLessonSummary(teacherToken, duplicateSummaryData);
                throw new Error('Request should have failed with 400 due to existing summary');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                // Optionally assert error message e.g. response.data.message contains "Summary already exists"
            }
        });

        it('should return 400 Bad Request if the lesson is not COMPLETED', async () => {
            // Setup: Create a lesson that is ACCEPTED but not COMPLETED
            const lessonRequest = await createTestLessonRequest(studentToken, student.id, LessonType.VOICE);
            const quotes = await createTestLessonQuote(studentToken, {
                lessonRequestId: lessonRequest.id,
                teacherIds: [teacher.id]
            });
            const quoteToAccept = quotes.find(q => q.teacher.id === teacher.id);
            if (!quoteToAccept) throw new Error('Setup for non-completed lesson test failed: no quote.');

            await acceptTestLessonQuote(studentToken, quoteToAccept.id);
            const lessonResponse = await getLessons(teacherToken, { quoteId: quoteToAccept.id });
            if (lessonResponse.status !== 200 || !Array.isArray(lessonResponse.data) || lessonResponse.data.length === 0) {
                throw new Error('Setup for non-completed lesson test failed: could not fetch lesson.');
            }
            const acceptedLesson = lessonResponse.data[0];

            // Ensure it's not accidentally COMPLETED (it should be ACCEPTED or similar)
            expect(acceptedLesson.currentStatus?.status).not.toBe(LessonStatusValue.COMPLETED);
            // For this test, we assume ACCEPTED is a non-completed state sufficient to test the constraint.
            // If API automatically moves it to PLANNED or something else, this check might need adjustment.
            // Or we might need a utility to ensure a lesson is in a specific non-completed state.

            const summaryData: CreateLessonSummaryDto = {
                lessonId: acceptedLesson.id,
                summary: 'Summary for a non-completed (accepted) lesson.',
                homework: 'Homework for a non-completed lesson.',
            };
            try {
                await createLessonSummary(teacherToken, summaryData);
                throw new Error('Request should have failed with 400 because lesson is not completed');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                // Optionally assert error message e.g. response.data.message contains "Lesson is not completed"
            }
        });
    });
}); 