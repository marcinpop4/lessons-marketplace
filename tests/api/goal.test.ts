import { UserType } from '@shared/models/UserType';
import { GoalStatusValue, GoalStatusTransition } from '@shared/models/GoalStatus';
import { LessonType } from '@shared/models/LessonType';
import { Goal } from '@shared/models/Goal'; // Import Goal type for responses
import { Lesson } from '@shared/models/Lesson'; // <-- Added missing import
import axios from 'axios'; // Import axios for direct calls and error checking

// Import test utilities
import { createTestStudent, createTestTeacher, loginTestUser } from '../utils/user.utils';
import { createTestLessonRequest } from '../utils/lessonRequest.utils';
import { createTestLessonQuote, acceptTestLessonQuote } from '../utils/lessonQuote.utils';
// Import Goal utilities
import {
    createGoal,
    createGoalUnauthenticated,
    getGoalsByLessonId,
    getGoalsByLessonIdUnauthenticated,
    getGoalById,
    getGoalByIdUnauthenticated,
    updateGoalStatus,
    updateGoalStatusUnauthenticated,
    patchGoalRaw,
} from '../utils/goal.utils';
import { v4 as uuidv4 } from 'uuid';

// Reintroduce API_BASE_URL constant specifically for the direct request test
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('Missing required env var VITE_API_BASE_URL for goal tests (needed for direct request test)');
}

// --- Test Suite ---

describe('API Integration: /api/v1/goals', () => {
    let studentAuthToken: string; // Raw token
    let teacherAuthToken: string; // Raw token
    let studentId: string;
    let teacherId: string;
    let testLessonId: string;
    let testGoalId: string; // To store the ID of a goal created for testing GET/PATCH/DELETE

    // Setup: Create users and a lesson
    beforeAll(async () => {
        try {
            // 1. Create Student & Teacher
            const { user: student, password: studentPassword } = await createTestStudent();
            // Create teacher and explicitly request the GUITAR rate needed for the lesson
            const { user: teacher, password: teacherPassword } = await createTestTeacher([
                { lessonType: LessonType.GUITAR, rateInCents: 4500 } // Specify GUITAR rate
            ]);
            studentId = student.id;
            teacherId = teacher.id;

            // 2. Login Users (store raw tokens)
            studentAuthToken = await loginTestUser(student.email, studentPassword, UserType.STUDENT);
            teacherAuthToken = await loginTestUser(teacher.email, teacherPassword, UserType.TEACHER);

            // 3. Create Lesson Request (Student) - Pass raw token
            const lessonRequest = await createTestLessonRequest(
                studentAuthToken,
                studentId,
                LessonType.GUITAR,
                new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
                60
            );

            // 4. Create Lesson Quote (Generate - Student for specific teacher)
            const createdQuotes = await createTestLessonQuote(studentAuthToken, {
                lessonRequestId: lessonRequest.id,
                teacherIds: [teacherId] // Specify the teacher ID
            });

            // Expect at least one quote to be generated
            if (!createdQuotes || createdQuotes.length === 0) {
                throw new Error('No quotes were generated in the test setup.');
            }

            // Find the specific quote from OUR teacher
            const lessonQuote = createdQuotes.find(q => q.teacher?.id === teacherId);
            if (!lessonQuote) {
                console.error(`Setup Error: Could not find quote from expected teacher ${teacherId} in generated quotes:`, createdQuotes);
                throw new Error(`Setup Error: Quote from teacher ${teacherId} not found.`);
            }

            // 5. Accept the specific Quote (Student) - This creates the Lesson implicitly
            await acceptTestLessonQuote(studentAuthToken, lessonQuote.id);

            // 6. Fetch the newly created Lesson using the quoteId (using axios)
            let createdLesson: Lesson | undefined;
            try {
                const fetchLessonResponse = await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${studentAuthToken}` },
                    params: { quoteId: lessonQuote.id }
                });

                if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.data) || fetchLessonResponse.data.length !== 1) {
                    console.error("Failed to fetch created lesson in goal setup:", fetchLessonResponse.status, fetchLessonResponse.data);
                    throw new Error(`Failed to fetch lesson associated with quote ${lessonQuote.id} in setup.`);
                }

                createdLesson = fetchLessonResponse.data[0] as Lesson;
            } catch (error: any) {
                console.error("Error fetching lesson in beforeAll:", axios.isAxiosError(error) ? error.response?.data : error);
                throw new Error(`Failed to fetch lesson associated with quote ${lessonQuote.id} in setup: ${error.message}`);
            }

            if (!createdLesson || !createdLesson.id) {
                console.error("Fetched lesson object is invalid:", createdLesson);
                throw new Error('Fetched lesson object is invalid in setup.');
            }
            testLessonId = createdLesson.id;

            // Goal will be created within the POST test

        } catch (error) {
            console.error('[Goal Test Setup] Error in beforeAll:', error);
            throw error; // Fail fast if setup fails
        }
    }, 60000); // Increased timeout for multi-step setup

    // --- Test Cases ---

    describe('POST /', () => {
        const goalData = {
            lessonId: '', // Will be set dynamically
            title: 'Learn Major Scales',
            description: 'Practice C Major and G Major scales daily.',
            estimatedLessonCount: 5
        };

        beforeEach(() => {
            goalData.lessonId = testLessonId; // Ensure correct lesson ID is set before each test
        });

        it('should create a new goal for the lesson (201 Created)', async () => {
            const response = await createGoal(teacherAuthToken, goalData);

            expect(response.status).toBe(201);
            const createdGoal: Goal = response.data; // Use response.data
            expect(createdGoal).toHaveProperty('id');
            expect(createdGoal.lessonId).toBe(testLessonId);
            expect(createdGoal.description).toBe(goalData.description);
            expect(createdGoal.title).toBe(goalData.title);
            expect(createdGoal.estimatedLessonCount).toBe(goalData.estimatedLessonCount);
            expect(createdGoal.currentStatus).toBeDefined();
            expect(createdGoal.currentStatus.status).toBe(GoalStatusValue.CREATED);

            testGoalId = createdGoal.id; // Store for later tests
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await createGoalUnauthenticated(goalData);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if requested by a Student', async () => {
            try {
                await createGoal(studentAuthToken, goalData);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });

        it('should return 400 Bad Request if lessonId is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const badData = { title: 'Test', description: 'Desc', estimatedLessonCount: 3 }; // Missing lessonId
            try {
                await axios.post(`${API_BASE_URL}/api/v1/goals`, badData, {
                    headers: { 'Authorization': `Bearer ${teacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Valid Lesson ID is required.');
            }
        });

        it('should return 400 Bad Request if description is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const badData = { lessonId: testLessonId, title: 'Test', estimatedLessonCount: 3 }; // Missing description
            try {
                await axios.post(`${API_BASE_URL}/api/v1/goals`, badData, {
                    headers: { 'Authorization': `Bearer ${teacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Description is required and must be a non-empty string.');
            }
        });

        it('should return 400 Bad Request if title is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const badData = { lessonId: testLessonId, description: 'Desc', estimatedLessonCount: 3 }; // Missing title
            try {
                await axios.post(`${API_BASE_URL}/api/v1/goals`, badData, {
                    headers: { 'Authorization': `Bearer ${teacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Title is required and must be a non-empty string.');
            }
        });

        it('should return 400 Bad Request if estimatedLessonCount is missing or invalid', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const baseGoalData = { lessonId: testLessonId, title: 'Test', description: 'Desc' };
            const headers = { 'Authorization': `Bearer ${teacherAuthToken}` };

            // Missing count
            try {
                await axios.post(`${API_BASE_URL}/api/v1/goals`, baseGoalData, { headers });
                throw new Error('Request (missing count) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Estimated Lesson Count must be a positive integer.');
            }

            // Invalid (zero)
            try {
                await axios.post(`${API_BASE_URL}/api/v1/goals`, { ...baseGoalData, estimatedLessonCount: 0 }, { headers });
                throw new Error('Request (zero count) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Estimated Lesson Count must be a positive integer.');
            }

            // Invalid (string)
            try {
                await axios.post(`${API_BASE_URL}/api/v1/goals`, { ...baseGoalData, estimatedLessonCount: 'five' }, { headers });
                throw new Error('Request (string count) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Estimated Lesson Count must be a positive integer.');
            }
        });

        it('should return 404 Not Found if lessonId does not exist', async () => {
            const nonExistentLessonId = uuidv4();
            try {
                await createGoal(teacherAuthToken, { ...goalData, lessonId: nonExistentLessonId });
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.error).toContain(`Lesson with ID ${nonExistentLessonId} not found`);
            }
        });

        it('should return 403 Forbidden if teacher tries to create goal for lesson they are not part of', async () => {
            // 1. Create another teacher and lesson
            const { user: otherTeacher, password: otherPassword } = await createTestTeacher();
            const otherTeacherToken = await loginTestUser(otherTeacher.email, otherPassword, UserType.TEACHER);
            const otherLessonRequest = await createTestLessonRequest(studentAuthToken, studentId, LessonType.VOICE);

            // Generate quote (Student)
            const otherQuotes = await createTestLessonQuote(studentAuthToken, {
                lessonRequestId: otherLessonRequest.id,
                teacherIds: [otherTeacher.id] // Specify the other teacher
            });
            if (!otherQuotes || otherQuotes.length === 0) {
                throw new Error('No quotes generated for other teacher test.');
            }
            const otherQuote = otherQuotes[0];

            // Accept quote to create lesson (Student)
            await acceptTestLessonQuote(studentAuthToken, otherQuote.id);

            // Fetch the actual lesson created (using axios)
            let otherLesson: Lesson | undefined;
            try {
                const fetchLessonResponse = await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${studentAuthToken}` },
                    params: { quoteId: otherQuote.id }
                });

                if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.data) || fetchLessonResponse.data.length !== 1) {
                    throw new Error(`Failed to fetch other lesson associated with quote ${otherQuote.id} in test.`);
                }
                otherLesson = fetchLessonResponse.data[0] as Lesson;
            } catch (fetchError: any) {
                console.error("Error fetching other lesson:", axios.isAxiosError(fetchError) ? fetchError.response?.data : fetchError);
                throw new Error(`Failed to fetch other lesson: ${fetchError.message}`);
            }

            if (!otherLesson || !otherLesson.id) {
                throw new Error('Could not get ID for other lesson.');
            }

            // 2. Try creating goal for other lesson using original teacher token
            const badGoalData = { lessonId: otherLesson.id, title: 'Unauthorized Goal', description: 'Should fail', estimatedLessonCount: 1 };
            try {
                await createGoal(teacherAuthToken, badGoalData);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('User is not authorized to create goals for this lesson.');
            }
        });
    });

    describe('GET /?lessonId=...', () => {
        it('should return goals for the lesson when requested by the student', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            // Ensure a goal exists for this lesson first (use the one created in POST test if available)
            if (!testGoalId) {
                try {
                    const createResp = await createGoal(teacherAuthToken, { lessonId: testLessonId, title: 'Temp Goal GET Student', description: 'Desc', estimatedLessonCount: 1 });
                    if (createResp.status !== 201 || !createResp.data.id) { // Check data.id
                        throw new Error('Failed to create temporary goal for GET test (student)');
                    }
                    testGoalId = createResp.data.id; // Assign from data.id
                } catch (createError) {
                    console.error("Error creating goal for GET student test:", createError);
                    throw new Error('Failed to create temporary goal for GET test (student)');
                }
            }
            const response = await getGoalsByLessonId(studentAuthToken, testLessonId);
            expect(response.status).toBe(200);
            const goals: Goal[] = response.data; // Use response.data
            expect(Array.isArray(goals)).toBe(true);
            expect(goals.length).toBeGreaterThan(0);
            expect(goals.some(g => g.lessonId === testLessonId)).toBe(true); // Check if any goal has the correct lessonId
        });

        it('should return goals for the lesson when requested by the teacher', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            if (!testGoalId) throw new Error('Goal ID not set for GET goals test'); // Ensure goal exists

            const response = await getGoalsByLessonId(teacherAuthToken, testLessonId);
            expect(response.status).toBe(200);
            const goals: Goal[] = response.data; // Use response.data
            expect(Array.isArray(goals)).toBe(true);
            expect(goals.length).toBeGreaterThan(0);
            expect(goals.some(g => g.lessonId === testLessonId)).toBe(true); // Check if any goal has the correct lessonId
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            try {
                await getGoalsByLessonIdUnauthenticated(testLessonId);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 400 Bad Request if lessonId is missing or invalid', async () => {
            // Missing lessonId
            try {
                await axios.get(`${API_BASE_URL}/api/v1/goals`, { // No query param
                    headers: { 'Authorization': `Bearer ${teacherAuthToken}` }
                });
                throw new Error('Request (missing lessonId) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Valid Lesson ID is required');
            }

            // Invalid lessonId format
            try {
                await getGoalsByLessonId(teacherAuthToken, 'invalid-uuid');
                throw new Error('Request (invalid lessonId) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Valid Lesson ID is required');
            }
        });

        it('should return 404 Not Found if lessonId does not exist', async () => {
            const nonExistentLessonId = uuidv4();
            try {
                await getGoalsByLessonId(teacherAuthToken, nonExistentLessonId);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.error).toContain(`Lesson with ID ${nonExistentLessonId} not found`);
            }
        });

        it('should return 403 Forbidden if user tries to get goals for a lesson they are not part of', async () => {
            // 1. Create a new lesson with a different teacher
            const { user: otherTeacher, password: otherPassword } = await createTestTeacher([
                { lessonType: LessonType.BASS, rateInCents: 5500 }
            ]);
            const otherTeacherToken = await loginTestUser(otherTeacher.email, otherPassword, UserType.TEACHER);
            const newLessonRequest = await createTestLessonRequest(studentAuthToken, studentId, LessonType.BASS);

            // Generate quote (Student for otherTeacher)
            const newQuotes = await createTestLessonQuote(studentAuthToken, {
                lessonRequestId: newLessonRequest.id,
                teacherIds: [otherTeacher.id]
            });
            if (!newQuotes || newQuotes.length === 0) throw new Error('No quotes generated for get goal auth test.');
            const newQuote = newQuotes.find(q => q.teacher?.id === otherTeacher.id);
            if (!newQuote) throw new Error('Could not find quote from otherTeacher.');

            // Accept quote (Student)
            await acceptTestLessonQuote(studentAuthToken, newQuote.id);

            // Fetch the new lesson ID (using axios)
            let newLessonId: string;
            try {
                const fetchLessonResponse = await axios.get(`${API_BASE_URL}/api/v1/lessons`, {
                    headers: { 'Authorization': `Bearer ${studentAuthToken}` },
                    params: { quoteId: newQuote.id }
                });
                if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.data) || fetchLessonResponse.data.length !== 1) {
                    throw new Error(`Failed to fetch new lesson associated with quote ${newQuote.id} in test.`);
                }
                newLessonId = fetchLessonResponse.data[0].id;
            } catch (fetchError: any) {
                console.error("Error fetching new lesson:", axios.isAxiosError(fetchError) ? fetchError.response?.data : fetchError);
                throw new Error(`Failed to fetch new lesson: ${fetchError.message}`);
            }

            // 2. Create a goal for this new lesson (using the correct teacher token)
            await createGoal(otherTeacherToken, { lessonId: newLessonId, title: 'Bass Goal', description: 'Slap da bass', estimatedLessonCount: 4 });

            // 3. Try to fetch goals for this new lesson using the *original* teacher's token
            try {
                await getGoalsByLessonId(teacherAuthToken, newLessonId);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('User is not authorized to view goals for this lesson.');
            }
        });
    });

    describe('GET /:goalId', () => {
        it('should return a specific goal when requested by the student', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            const response = await getGoalById(studentAuthToken, testGoalId);
            expect(response.status).toBe(200);
            const goal: Goal = response.data; // Use response.data
            expect(goal.id).toBe(testGoalId);
            expect(goal.lessonId).toBe(testLessonId); // Ensure it's the correct lesson
        });

        it('should return a specific goal when requested by the teacher', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            const response = await getGoalById(teacherAuthToken, testGoalId);
            expect(response.status).toBe(200);
            const goal: Goal = response.data; // Use response.data
            expect(goal.id).toBe(testGoalId);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            try {
                await getGoalByIdUnauthenticated(testGoalId);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 400 Bad Request if goalId is invalid', async () => {
            try {
                await getGoalById(teacherAuthToken, 'invalid-uuid');
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Valid Goal ID is required');
            }
        });

        it('should return 404 Not Found if the goal does not exist', async () => {
            const nonExistentGoalId = uuidv4();
            try {
                await getGoalById(teacherAuthToken, nonExistentGoalId);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.error).toContain(`Goal with ID ${nonExistentGoalId} not found`);
            }
        });

        it('should return 403 Forbidden if the teacher tries to get a goal for a lesson they are not part of', async () => {
            // 1. Ensure the primary test goal exists (created in POST test or beforeAll)
            if (!testGoalId) {
                try {
                    const createResp = await createGoal(teacherAuthToken, { lessonId: testLessonId, title: 'Setup Goal 403', description: 'For 403 test', estimatedLessonCount: 1 });
                    if (createResp.status !== 201 || !createResp.data.id) { // Check data.id
                        throw new Error('Failed to create prerequisite goal for 403 test');
                    }
                    testGoalId = createResp.data.id; // Assign from data.id
                } catch (createError) {
                    console.error("Error creating goal for GET 403 test:", createError);
                    throw new Error('Failed to create prerequisite goal for 403 test');
                }
            }

            // 2. Create a completely separate teacher
            const { user: unrelatedTeacher, password: unrelatedPassword } = await createTestTeacher();
            const unrelatedTeacherToken = await loginTestUser(unrelatedTeacher.email, unrelatedPassword, UserType.TEACHER);

            // 3. Attempt fetch of the original goal (testGoalId) using the unrelated teacher's token
            try {
                await getGoalById(unrelatedTeacherToken, testGoalId);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('User is not authorized to view this goal.');
            }
        });
    });

    describe('PATCH /:goalId', () => {
        let goalForPatchTestId: string;

        // Create a fresh goal in CREATED state before each PATCH test
        beforeEach(async () => {
            try {
                const goalData = {
                    lessonId: testLessonId,
                    title: 'Goal for PATCH suite',
                    description: 'Reset before each test',
                    estimatedLessonCount: 1
                };
                const response = await createGoal(teacherAuthToken, goalData);
                if (response.status !== 201 || !response.data.id) { // Check data.id
                    throw new Error('Failed to create prerequisite goal for PATCH /:goalId test');
                }
                goalForPatchTestId = response.data.id; // Assign from data.id
            } catch (createError) {
                console.error("Error creating goal in PATCH beforeEach:", createError);
                throw new Error('Failed to create prerequisite goal for PATCH /:goalId test');
            }
        });

        it('should allow the TEACHER to update the goal status (e.g., START)', async () => {
            const response = await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.START);
            expect(response.status).toBe(200);
            const updatedGoal: Goal = response.data; // Use response.data
            expect(updatedGoal.id).toBe(goalForPatchTestId);
            expect(updatedGoal.currentStatus.status).toBe(GoalStatusValue.IN_PROGRESS);
        });

        it('should allow the TEACHER to update the goal status again (e.g., COMPLETE)', async () => {
            // Ensure it's IN_PROGRESS first
            await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.START);

            const response = await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.COMPLETE);
            expect(response.status).toBe(200);
            const updatedGoal: Goal = response.data; // Use response.data
            expect(updatedGoal.id).toBe(goalForPatchTestId);
            expect(updatedGoal.currentStatus.status).toBe(GoalStatusValue.ACHIEVED);
        });

        it('should return 400 Bad Request for an invalid status transition (e.g., CREATED to COMPLETE)', async () => {
            // Goal is already created in beforeEach
            try {
                await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.COMPLETE);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Invalid status transition');
            }
        });

        it('should return 400 Bad Request if transition is missing or invalid value', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            if (!goalForPatchTestId) throw new Error('Goal ID for patch test missing');

            // Missing transition
            try {
                await patchGoalRaw(teacherAuthToken, goalForPatchTestId, {});
                throw new Error('Request (missing transition) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Invalid or missing transition value provided.');
            }

            // Invalid transition value
            try {
                await patchGoalRaw(teacherAuthToken, goalForPatchTestId, { transition: 'INVALID_STATUS' });
                throw new Error('Request (invalid transition) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Invalid or missing transition value provided.');
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await updateGoalStatusUnauthenticated(goalForPatchTestId, GoalStatusTransition.START);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if requested by the Student', async () => {
            try {
                await updateGoalStatus(studentAuthToken, goalForPatchTestId, GoalStatusTransition.START);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });

        it('should return 403 Forbidden if requested by an unrelated Teacher', async () => {
            // Create unrelated teacher (raw token)
            const { user: unrelated, password } = await createTestTeacher();
            const unrelatedToken = await loginTestUser(unrelated.email, password, UserType.TEACHER);

            try {
                await updateGoalStatus(unrelatedToken, goalForPatchTestId, GoalStatusTransition.START);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('User is not authorized to update the status of this goal.');
            }
        });

        it('should return 404 Not Found for a non-existent goal ID', async () => {
            const nonExistentGoalId = uuidv4();
            try {
                await updateGoalStatus(teacherAuthToken, nonExistentGoalId, GoalStatusTransition.START);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.error).toContain(`Goal with ID ${nonExistentGoalId} not found`);
            }
        });

        it('should return 400 Bad Request for an invalid goal ID format', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const invalidId = 'not-a-uuid';
            try {
                await updateGoalStatus(teacherAuthToken, invalidId, GoalStatusTransition.START);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toBe('Valid Goal ID is required.');
            }
        });
    });
}); 