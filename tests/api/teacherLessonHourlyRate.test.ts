import request from 'supertest';
import { LessonType, Prisma } from '@prisma/client';
import { UserType } from '@shared/models/UserType';
import { TeacherLessonHourlyRateStatusValue, TeacherLessonHourlyRateStatusTransition } from '@shared/models/TeacherLessonHourlyRateStatus';

// Import test utilities
import { createTestTeacher, loginTestUser, createTestStudent } from './utils/user.utils';
import { createTestTeacherRate, updateTestRateStatus } from './utils/teacherRate.utils';
import { v4 as uuidv4 } from 'uuid';

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Suite --- 

describe('API Integration: /api/v1/teacher-lesson-rates', () => {
    let testTeacherId: string | null = null;
    let testTeacherAuthToken: string | null = null;

    // Setup: Create and login a test teacher
    beforeAll(async () => {
        try {
            const { user: teacher, password } = await createTestTeacher();
            if (!teacher || !teacher.id || !teacher.email || !password) {
                throw new Error('Test setup failed: Could not create test teacher or get credentials.');
            }
            testTeacherId = teacher.id;
            const token = await loginTestUser(teacher.email, password, UserType.TEACHER);
            testTeacherAuthToken = `Bearer ${token}`;
        } catch (error) {
            console.error('[Rate Test Setup] Error in beforeAll:', error);
            throw error; // Fail fast if setup fails
        }
    }, 30000);

    // No afterAll needed for user cleanup assuming test DB is reset

    describe('POST /', () => {
        let createdRateId: string | null = null;
        const testRateType = LessonType.BASS;
        const testRateAmount = 7500;

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teacher-lesson-rates')
                .send({ lessonType: testRateType, rateInCents: testRateAmount });
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if accessed by a student', async () => {
            const { user: student, password } = await createTestStudent();
            const studentToken = await loginTestUser(student.email, password, UserType.STUDENT);
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teacher-lesson-rates')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ lessonType: testRateType, rateInCents: testRateAmount });
            expect(response.status).toBe(403);
        });

        it('should ADD a new lesson rate for the authenticated teacher (status ACTIVE)', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');

            // Use utility
            const createdRate = await createTestTeacherRate(testTeacherAuthToken, testRateType, testRateAmount);

            expect(createdRate).toBeDefined();
            expect(createdRate.type).toBe(testRateType);
            expect(createdRate.rateInCents).toBe(testRateAmount);
            expect(createdRate.teacherId).toBe(testTeacherId);
            expect(createdRate.id).toBeDefined();
            expect(createdRate.currentStatus).toBeDefined();
            expect(createdRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
            createdRateId = createdRate.id; // Store ID for next test
        });

        it('should UPDATE by creating a NEW rate when price changes (new status ACTIVE)', async () => {
            if (!testTeacherAuthToken || !createdRateId) throw new Error('Auth token or created rate ID not available');
            const newRateAmount = testRateAmount + 1000;

            // Use utility
            const updatedRate = await createTestTeacherRate(testTeacherAuthToken, testRateType, newRateAmount);

            expect(updatedRate).toBeDefined();
            expect(updatedRate.id).not.toBe(createdRateId); // Expect a NEW ID
            expect(updatedRate.type).toBe(testRateType);
            expect(updatedRate.rateInCents).toBe(newRateAmount);
            expect(updatedRate.teacherId).toBe(testTeacherId);
            expect(updatedRate.currentStatus).toBeDefined();
            expect(updatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
        });

        it('should return 400 Bad Request if data is missing', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            // Utility validates input, but we can test the raw endpoint for direct 400
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teacher-lesson-rates')
                .set('Authorization', testTeacherAuthToken)
                .send({ lessonType: testRateType }); // Missing rateInCents
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing or invalid data');
        });
    });

    // Updated tests for PATCH /:rateId/status
    describe('PATCH /:rateId/status', () => {
        let rateToModifyId: string | null = null;
        const rateTypeToModify = LessonType.DRUMS;

        // Create a rate specifically for these tests using the utility
        beforeAll(async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher token needed for rate setup');
            try {
                const rate = await createTestTeacherRate(testTeacherAuthToken, rateTypeToModify, 8000);
                rateToModifyId = rate.id;
                console.log(`[Rate Status Tests Setup] Ensured rate exists via util, ID: ${rateToModifyId}`);

                // Ensure it starts ACTIVE (utility should handle this, but double-check)
                if (rate.currentStatus?.status !== TeacherLessonHourlyRateStatusValue.ACTIVE) {
                    console.warn(`[Rate Status Tests Setup] Rate ${rateToModifyId} was not active after creation, attempting util activate.`);
                    await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.ACTIVATE);
                    console.log(`[Rate Status Tests Setup] Activated rate ${rateToModifyId} via util.`);
                }
            } catch (error) {
                console.error('[Rate Status Tests Setup] Error using utils:', error);
                throw error;
            }
        });

        it('should DEACTIVATE an active lesson rate', async () => {
            if (!testTeacherAuthToken || !rateToModifyId) throw new Error('Auth or rate ID missing');

            // Use utility
            const deactivatedRate = await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            expect(deactivatedRate).toBeDefined();
            expect(deactivatedRate.id).toBe(rateToModifyId);
            expect(deactivatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.INACTIVE);
        });

        it('should return 409 Conflict if trying to DEACTIVATE an already inactive rate', async () => {
            if (!testTeacherAuthToken || !rateToModifyId) throw new Error('Auth or rate ID missing');
            // Ensure deactivated using utility
            await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // Try again (expecting error from raw call)
            const response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${rateToModifyId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({ transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE });
            expect(response.status).toBe(409);
            expect(response.body.error).toContain('Invalid transition');
        });

        it('should return 400 Bad Request if transition is missing or invalid', async () => {
            if (!testTeacherAuthToken || !rateToModifyId) throw new Error('Auth or rate ID missing');
            // Test raw endpoint calls
            let response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${rateToModifyId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing transition');

            response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${rateToModifyId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({ transition: 'SOME_INVALID_ACTION' });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing transition');
        });

        it('should return 404 if trying to update status for a non-existent rate ID', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token not available');
            const nonExistentRateId = uuidv4();
            // Test raw endpoint call
            const response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${nonExistentRateId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({ transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE });
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('Lesson rate not found');
        });

        it('should return 400 Bad Request if the rate ID format is invalid', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token not available');
            const invalidRateId = 'not-a-valid-uuid';
            // Test raw endpoint call
            const response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${invalidRateId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({ transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid or missing rate ID');
        });

        // --- Reactivate --- 
        it('should ACTIVATE an inactive lesson rate', async () => {
            if (!testTeacherAuthToken || !rateToModifyId) throw new Error('Auth or rate ID missing');
            // Ensure deactivated using utility
            await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // Reactivate using utility
            const reactivatedRate = await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.ACTIVATE);

            expect(reactivatedRate).toBeDefined();
            expect(reactivatedRate.id).toBe(rateToModifyId);
            expect(reactivatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
        });

        it('should return 409 Conflict if trying to ACTIVATE an already active rate', async () => {
            if (!testTeacherAuthToken || !rateToModifyId) throw new Error('Auth or rate ID missing');
            // Ensure active using utility
            await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.ACTIVATE);

            // Try again (expecting error from raw call)
            const response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${rateToModifyId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({ transition: TeacherLessonHourlyRateStatusTransition.ACTIVATE });
            expect(response.status).toBe(409);
            expect(response.body.error).toContain('Invalid transition');
        });

        it('should return 409 Conflict if trying to ACTIVATE a rate when another rate of the same type is already active', async () => {
            if (!testTeacherAuthToken || !rateToModifyId) throw new Error('Auth or rate ID missing for conflict test');

            // 1. Ensure the primary rate (rateToModifyId) is INACTIVE using utility
            await updateTestRateStatus(testTeacherAuthToken, rateToModifyId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // 2. Create a *second* rate of the SAME type (DRUMS) using utility
            const secondRate = await createTestTeacherRate(testTeacherAuthToken, rateTypeToModify, 9000); // Different rate
            const secondRateId = secondRate.id;

            // 3. Attempt to ACTIVATE the original (now INACTIVE) rate (raw call to check error)
            const response = await request(API_BASE_URL!)
                .patch(`/api/v1/teacher-lesson-rates/${rateToModifyId}/status`)
                .set('Authorization', testTeacherAuthToken)
                .send({ transition: TeacherLessonHourlyRateStatusTransition.ACTIVATE });

            expect(response.status).toBe(409);
            expect(response.body.error).toContain(`Cannot activate rate: Another rate for type ${rateTypeToModify} is already active`);

            // Cleanup: Deactivate the second rate using utility
            await updateTestRateStatus(testTeacherAuthToken, secondRateId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);
        });
    });
}); 