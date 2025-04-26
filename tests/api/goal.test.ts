import request from 'supertest';
import { UserType } from '@shared/models/UserType';
import { GoalStatusValue, GoalStatusTransition } from '@shared/models/GoalStatus';
import { LessonType } from '@shared/models/LessonType';

// Import test utilities
import { createTestStudent, createTestTeacher, loginTestUser } from './utils/user.utils';
import { createTestLessonRequest } from './utils/lessonRequest.utils';
import { createTestLessonQuote, acceptTestLessonQuote } from './utils/lessonQuote.utils';
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
} from './utils/goal.utils';
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
            const { user: teacher, password: teacherPassword } = await createTestTeacher();
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

            // 4. Create Lesson Quote (Teacher) - Pass raw token
            const lessonQuote = await createTestLessonQuote(teacherAuthToken, {
                lessonRequestId: lessonRequest.id,
                costInCents: 5000,
                hourlyRateInCents: 5000,
            });

            // 5. Accept Quote (Student) - This creates the Lesson implicitly
            // The acceptTestLessonQuote function now returns the lessonRequestId (string)
            // We don't need to assign its result directly if we fetch by quoteId
            await acceptTestLessonQuote(studentAuthToken, lessonQuote.id);

            // 6. Fetch the newly created Lesson using the quoteId
            const fetchLessonResponse = await request(API_BASE_URL!)
                .get('/api/v1/lessons')
                .set('Authorization', `Bearer ${studentAuthToken}`) // Use student or teacher token
                .query({ quoteId: lessonQuote.id });

            if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.body) || fetchLessonResponse.body.length !== 1) {
                console.error("Failed to fetch created lesson in goal setup:", fetchLessonResponse.status, fetchLessonResponse.body);
                throw new Error(`Failed to fetch lesson associated with quote ${lessonQuote.id} in setup.`);
            }

            const createdLesson = fetchLessonResponse.body[0];
            if (!createdLesson || !createdLesson.id) {
                console.error("Fetched lesson object is invalid:", createdLesson);
                throw new Error('Fetched lesson object is invalid in setup.');
            }
            testLessonId = createdLesson.id; // Assign the actual Lesson ID

            // Goal will be created within the POST test

        } catch (error) {
            console.error('[Goal Test Setup] Error in beforeAll:', error);
            throw error; // Fail fast if setup fails
        }
    }, 45000); // Increased timeout for multi-step setup

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
            expect(response.body).toHaveProperty('id');
            expect(response.body.lessonId).toBe(testLessonId);
            expect(response.body.description).toBe(goalData.description);
            expect(response.body.title).toBe(goalData.title);
            expect(response.body.estimatedLessonCount).toBe(goalData.estimatedLessonCount);
            expect(response.body.currentStatus).toBeDefined();
            expect(response.body.currentStatus.status).toBe(GoalStatusValue.CREATED);

            testGoalId = response.body.id; // Store for later tests
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await createGoalUnauthenticated(goalData);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if requested by a Student', async () => {
            const response = await createGoal(studentAuthToken, goalData);
            expect(response.status).toBe(403);
        });

        it('should return 400 Bad Request if lessonId is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const goalData = { title: 'Test', description: 'Desc', estimatedLessonCount: 3 }; // Missing lessonId
            // Use direct request call
            const response = await request(API_BASE_URL!)
                .post('/api/v1/goals')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(goalData);
            expect(response.status).toBe(400);
            // Expect error message from service validation
            expect(response.body.error).toBe('Valid Lesson ID is required.');
        });

        it('should return 400 Bad Request if description is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const goalData = { lessonId: testLessonId, title: 'Test', estimatedLessonCount: 3 }; // Missing description
            // Use direct request call
            const response = await request(API_BASE_URL!)
                .post('/api/v1/goals')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(goalData);
            expect(response.status).toBe(400);
            // Expect error message from service validation
            expect(response.body.error).toBe('Description is required and must be a non-empty string.');
        });

        it('should return 400 Bad Request if title is missing', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const goalData = { lessonId: testLessonId, description: 'Desc', estimatedLessonCount: 3 }; // Missing title
            // Use direct request call
            const response = await request(API_BASE_URL!)
                .post('/api/v1/goals')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(goalData);
            expect(response.status).toBe(400);
            // Expect error message from service validation
            expect(response.body.error).toBe('Title is required and must be a non-empty string.');
        });

        it('should return 400 Bad Request if estimatedLessonCount is missing or invalid', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const baseGoalData = { lessonId: testLessonId, title: 'Test', description: 'Desc' };

            // Missing count - Use direct request call
            let response = await request(API_BASE_URL!)
                .post('/api/v1/goals')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send(baseGoalData);
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Estimated Lesson Count must be a positive integer.');

            // Invalid (zero) - Use direct request call
            response = await request(API_BASE_URL!)
                .post('/api/v1/goals')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send({ ...baseGoalData, estimatedLessonCount: 0 });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Estimated Lesson Count must be a positive integer.');

            // Invalid (string) - Use direct request call
            response = await request(API_BASE_URL!)
                .post('/api/v1/goals')
                .set('Authorization', `Bearer ${teacherAuthToken}`)
                .send({ ...baseGoalData, estimatedLessonCount: 'five' });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Estimated Lesson Count must be a positive integer.');
        });

        it('should return 404 Not Found if lessonId does not exist', async () => {
            const nonExistentLessonId = uuidv4();
            const response = await createGoal(teacherAuthToken, { ...goalData, lessonId: nonExistentLessonId });
            expect(response.status).toBe(404);
            expect(response.body.error).toContain(`Lesson with ID ${nonExistentLessonId} not found`);
        });

        it('should return 403 Forbidden if teacher tries to create goal for lesson they are not part of', async () => {
            // 1. Create another teacher and lesson (ensure tokens are raw)
            const { user: otherTeacher, password: otherPassword } = await createTestTeacher();
            const otherTeacherToken = await loginTestUser(otherTeacher.email, otherPassword, UserType.TEACHER);
            const otherLessonRequest = await createTestLessonRequest(studentAuthToken, studentId, LessonType.VOICE);
            const otherQuote = await createTestLessonQuote(otherTeacherToken, { lessonRequestId: otherLessonRequest.id, costInCents: 4000, hourlyRateInCents: 4000 });

            // Accept quote to create lesson
            await acceptTestLessonQuote(studentAuthToken, otherQuote.id);

            // Fetch the actual lesson created
            const fetchLessonResponse = await request(API_BASE_URL!)
                .get('/api/v1/lessons')
                .set('Authorization', `Bearer ${studentAuthToken}`)
                .query({ quoteId: otherQuote.id });

            if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.body) || fetchLessonResponse.body.length !== 1) {
                throw new Error(`Failed to fetch other lesson associated with quote ${otherQuote.id} in test.`);
            }
            const otherLesson = fetchLessonResponse.body[0]; // Contains the other lesson object with its ID

            // 2. Try creating goal for other lesson using original teacher token
            const response = await createGoal(teacherAuthToken, { ...goalData, lessonId: otherLesson.id }); // Use the fetched lesson ID
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('User is not authorized to create goals for this lesson.');
        });
    });

    describe('GET /?lessonId=...', () => {
        it('should return goals for the lesson when requested by the student', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            // Ensure a goal exists for this lesson first
            if (!testGoalId) {
                const createResp = await createGoal(teacherAuthToken, { lessonId: testLessonId, title: 'Temp Goal', description: 'Desc', estimatedLessonCount: 1 });
                testGoalId = createResp.body.id;
            }
            const response = await getGoalsByLessonId(studentAuthToken, testLessonId);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((goal: any) => goal.id === testGoalId)).toBe(true);
        });

        it('should return goals for the lesson when requested by the teacher', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            const response = await getGoalsByLessonId(teacherAuthToken, testLessonId);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.some((goal: any) => goal.id === testGoalId)).toBe(true);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            const response = await getGoalsByLessonIdUnauthenticated(testLessonId);
            expect(response.status).toBe(401);
        });

        it('should return 400 Bad Request if lessonId query parameter is missing', async () => {
            if (!studentAuthToken) throw new Error('Student token needed');
            // Use direct request call without query param
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/goals`)
                .set('Authorization', `Bearer ${studentAuthToken}`);
            expect(response.status).toBe(400);
            // Expect error message from service validation
            expect(response.body.error).toBe('Valid Lesson ID is required.');
        });

        it('should return 403 Forbidden if requested by an unrelated user', async () => {
            if (!testLessonId) throw new Error('Lesson ID not set for GET goals test');
            // Create unrelated user (raw token)
            const { user: unrelated, password } = await createTestStudent();
            const unrelatedToken = await loginTestUser(unrelated.email, password, UserType.STUDENT);

            const response = await getGoalsByLessonId(unrelatedToken, testLessonId);
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('User is not authorized to view goals for this lesson.');
        });

        it('should return an empty array if the lesson exists but has no goals', async () => {
            // Create a new lesson that won't have goals associated by default
            const newLessonRequest = await createTestLessonRequest(studentAuthToken, studentId, LessonType.VOICE);
            const newQuote = await createTestLessonQuote(teacherAuthToken, { lessonRequestId: newLessonRequest.id, costInCents: 6000, hourlyRateInCents: 6000 });

            // Accept quote to create lesson
            await acceptTestLessonQuote(studentAuthToken, newQuote.id);

            // Fetch the actual lesson created
            const fetchLessonResponse = await request(API_BASE_URL!)
                .get('/api/v1/lessons')
                .set('Authorization', `Bearer ${studentAuthToken}`)
                .query({ quoteId: newQuote.id });

            if (fetchLessonResponse.status !== 200 || !Array.isArray(fetchLessonResponse.body) || fetchLessonResponse.body.length !== 1) {
                throw new Error(`Failed to fetch new lesson associated with quote ${newQuote.id} in test.`);
            }
            const newLesson = fetchLessonResponse.body[0]; // Contains the new lesson object with its ID

            const response = await getGoalsByLessonId(studentAuthToken, newLesson.id); // Use the fetched lesson ID
            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return 404 Not Found if the lessonId does not exist', async () => {
            const nonExistentLessonId = uuidv4();
            const response = await getGoalsByLessonId(studentAuthToken, nonExistentLessonId);
            expect(response.status).toBe(404); // Service should handle this check
            expect(response.body.error).toContain(`Lesson with ID ${nonExistentLessonId} not found.`);
        });
    });

    describe('GET /:goalId', () => {
        beforeAll(async () => {
            // Ensure testGoalId is set before running tests in this suite
            if (!testGoalId) {
                const goalData = {
                    lessonId: testLessonId,
                    title: 'Goal for GET/:id suite',
                    description: 'Ensure goal exists',
                    estimatedLessonCount: 1
                };
                const response = await createGoal(teacherAuthToken, goalData);
                if (response.status !== 201) {
                    throw new Error('Failed to create prerequisite goal for GET /:goalId tests');
                }
                testGoalId = response.body.id;
                console.log(`[Goal Tests GET/:id Setup] Ensured goal exists: ${testGoalId}`);
            }
        });

        it('should return the specific goal when requested by the student', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            const response = await getGoalById(studentAuthToken, testGoalId);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(testGoalId);
            expect(response.body.lessonId).toBe(testLessonId);
        });

        it('should return the specific goal when requested by the teacher', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            const response = await getGoalById(teacherAuthToken, testGoalId);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(testGoalId);
            expect(response.body.lessonId).toBe(testLessonId);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            const response = await getGoalByIdUnauthenticated(testGoalId);
            expect(response.status).toBe(401);
        });

        it('should return 404 Not Found for a non-existent goal ID', async () => {
            const nonExistentGoalId = uuidv4();
            const response = await getGoalById(studentAuthToken, nonExistentGoalId);
            expect(response.status).toBe(404);
            expect(response.body.error).toContain(`Goal with ID ${nonExistentGoalId} not found.`);
        });

        it('should return 400 Bad Request for an invalid goal ID format', async () => {
            if (!studentAuthToken) throw new Error('Student token needed');
            const invalidId = 'not-a-uuid';
            // Use standard utility - service validates ID format
            const response = await getGoalById(studentAuthToken, invalidId);
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Valid Goal ID is required.');
        });

        it('should return 403 Forbidden if requested by an unrelated user', async () => {
            if (!testGoalId) throw new Error('Goal ID not set for GET goal test');
            // Create unrelated user (raw token)
            const { user: unrelated, password } = await createTestStudent();
            const unrelatedToken = await loginTestUser(unrelated.email, password, UserType.STUDENT);

            const response = await getGoalById(unrelatedToken, testGoalId);
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('User is not authorized to view this goal.');
        });
    });

    describe('PATCH /:goalId', () => {
        let goalForPatchTestId: string;

        // Create a fresh goal in CREATED state before each PATCH test
        beforeEach(async () => {
            const goalData = {
                lessonId: testLessonId,
                title: 'Goal for PATCH suite',
                description: 'Reset before each test',
                estimatedLessonCount: 1
            };
            const response = await createGoal(teacherAuthToken, goalData);
            if (response.status !== 201) {
                throw new Error('Failed to create prerequisite goal for PATCH /:goalId test');
            }
            goalForPatchTestId = response.body.id;
        });

        it('should allow the TEACHER to update the goal status (e.g., START)', async () => {
            const response = await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.START);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(goalForPatchTestId);
            expect(response.body.currentStatus.status).toBe(GoalStatusValue.IN_PROGRESS);
        });

        it('should allow the TEACHER to update the goal status again (e.g., COMPLETE)', async () => {
            // Ensure it's IN_PROGRESS first
            await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.START);

            const response = await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.COMPLETE);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(goalForPatchTestId);
            expect(response.body.currentStatus.status).toBe(GoalStatusValue.ACHIEVED);
        });

        it('should return 400 Bad Request for an invalid status transition (e.g., CREATED to COMPLETE)', async () => {
            // Goal is already created in beforeEach
            const response = await updateGoalStatus(teacherAuthToken, goalForPatchTestId, GoalStatusTransition.COMPLETE);
            expect(response.status).toBe(400); // Or 409 Conflict
            expect(response.body.error).toContain('Invalid status transition');
        });

        it('should return 400 Bad Request if transition is missing or invalid value', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            if (!goalForPatchTestId) throw new Error('Goal ID for patch test missing');
            // Missing transition - Use patchGoalRaw
            let response = await patchGoalRaw(teacherAuthToken, goalForPatchTestId, {});
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid or missing transition value provided.');

            // Invalid transition value - Use patchGoalRaw
            response = await patchGoalRaw(teacherAuthToken, goalForPatchTestId, { transition: 'INVALID_STATUS' });
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid or missing transition value provided.');
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await updateGoalStatusUnauthenticated(goalForPatchTestId, GoalStatusTransition.START);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if requested by the Student', async () => {
            const response = await updateGoalStatus(studentAuthToken, goalForPatchTestId, GoalStatusTransition.START);
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Forbidden');
        });

        it('should return 403 Forbidden if requested by an unrelated Teacher', async () => {
            // Create unrelated teacher (raw token)
            const { user: unrelated, password } = await createTestTeacher();
            const unrelatedToken = await loginTestUser(unrelated.email, password, UserType.TEACHER);

            const response = await updateGoalStatus(unrelatedToken, goalForPatchTestId, GoalStatusTransition.START);
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('User is not authorized to update the status of this goal.');
        });

        it('should return 404 Not Found for a non-existent goal ID', async () => {
            const nonExistentGoalId = uuidv4();
            const response = await updateGoalStatus(teacherAuthToken, nonExistentGoalId, GoalStatusTransition.START);
            expect(response.status).toBe(404);
            expect(response.body.error).toContain(`Goal with ID ${nonExistentGoalId} not found`);
        });

        it('should return 400 Bad Request for an invalid goal ID format', async () => {
            if (!teacherAuthToken) throw new Error('Teacher token needed');
            const invalidId = 'not-a-uuid';
            // Use standard utility - service validates ID format
            const response = await updateGoalStatus(teacherAuthToken, invalidId, GoalStatusTransition.START);
            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Valid Goal ID is required.');
        });
    });
}); 