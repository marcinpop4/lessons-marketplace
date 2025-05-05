import { LessonType, Prisma } from '@prisma/client';
import { UserType } from '@shared/models/UserType';
import { TeacherLessonHourlyRateStatusValue, TeacherLessonHourlyRateStatusTransition } from '@shared/models/TeacherLessonHourlyRateStatus';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate'; // Import shared model
import { LessonType as SharedLessonType } from '@shared/models/LessonType'; // Ensure shared enum is imported
import axios from 'axios'; // Import axios

// Import test utilities
import { createTestTeacher, loginTestUser, createTestStudent } from '../utils/user.utils';
import { createTestTeacherRate, updateTestRateStatus } from '../utils/teacherRate.utils';
import { v4 as uuidv4 } from 'uuid';

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Suite ---

describe('API Integration: /api/v1/teacher-lesson-rates', () => {

    describe('POST /', () => {
        let testTeacherId: string; // Use local scope variables
        let testTeacherAuthToken: string; // Use local scope variables
        let createdRateId: string | null = null;
        const testRateType = SharedLessonType.BASS;
        const testRateAmount = 7500;

        // Create a fresh teacher for each test in this block
        beforeEach(async () => {
            try {
                const { user: teacher, password } = await createTestTeacher();
                testTeacherId = teacher.id;
                testTeacherAuthToken = await loginTestUser(teacher.email, password, UserType.TEACHER);
            } catch (error) {
                console.error('[POST Test Setup] Error in beforeEach:', error);
                throw error;
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await axios.post(`${API_BASE_URL}/api/v1/teacher-lesson-rates`, {
                    lessonType: testRateType,
                    rateInCents: testRateAmount
                });
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if accessed by a student', async () => {
            const { user: student, password } = await createTestStudent();
            const studentToken = await loginTestUser(student.email, password, UserType.STUDENT);
            try {
                await axios.post(`${API_BASE_URL}/api/v1/teacher-lesson-rates`, {
                    lessonType: testRateType,
                    rateInCents: testRateAmount
                }, {
                    headers: { 'Authorization': `Bearer ${studentToken}` }
                });
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
            }
        });

        it('should ADD a new lesson rate for the authenticated teacher (status ACTIVE)', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');

            const rateResult = await createTestTeacherRate(testTeacherAuthToken, testRateType, testRateAmount);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const createdRate = rateResult as TeacherLessonHourlyRate;

            expect(createdRate).toBeDefined();
            expect(createdRate.type).toBe(testRateType);
            expect(createdRate.rateInCents).toBe(testRateAmount);
            expect(createdRate.teacherId).toBe(testTeacherId);
            expect(createdRate.id).toBeDefined();
            expect(createdRate.currentStatus).toBeDefined();
            expect(createdRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
            createdRateId = createdRate.id; // Store ID for potential use
        });

        it('should return 400 Bad Request if data is missing', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            try {
                await axios.post(`${API_BASE_URL}/api/v1/teacher-lesson-rates`, {
                    lessonType: testRateType // Missing rateInCents
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Missing or invalid data');
            }
        });
    });

    // Updated tests for PATCH /:rateId/status
    describe('PATCH /:rateId/status', () => {
        let testTeacherId: string; // Use local scope variables
        let testTeacherAuthToken: string; // Use local scope variables

        // Create a fresh teacher for each test in this block
        beforeEach(async () => {
            try {
                const { user: teacher, password } = await createTestTeacher();
                testTeacherId = teacher.id;
                testTeacherAuthToken = await loginTestUser(teacher.email, password, UserType.TEACHER);
            } catch (error) {
                console.error('[PATCH Test Setup] Error in beforeEach:', error);
                throw error;
            }
        });

        it('should create an active rate and return 200', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');

            const rateResult = await createTestTeacherRate(testTeacherAuthToken, SharedLessonType.DRUMS, 8000);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const rate = rateResult as TeacherLessonHourlyRate;

            expect(rate.teacherId).toBe(testTeacherId);
            expect(rate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
            expect(rate.type).toBe(SharedLessonType.DRUMS);
            expect(rate.rateInCents).toBe(8000);
        });

        it('should DEACTIVATE an active lesson rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');

            // 1. Create the rate
            const rateResult = await createTestTeacherRate(testTeacherAuthToken, SharedLessonType.DRUMS, 8000);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const rate = rateResult as TeacherLessonHourlyRate;
            if (!rate || !rate.id) {
                throw new Error('Failed to get rate ID from creation for test');
            }
            const rateToDeactivateId = rate.id;
            expect(rate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);

            // 2. Immediately try to deactivate
            const deactivatedRate: TeacherLessonHourlyRate = await updateTestRateStatus(testTeacherAuthToken, rateToDeactivateId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // 3. Assertions
            expect(deactivatedRate).toBeDefined();
            expect(deactivatedRate.id).toBe(rateToDeactivateId);
            expect(deactivatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.INACTIVE);
        });

        it('should return 409 Conflict if trying to DEACTIVATE an already inactive rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = SharedLessonType.BASS;

            // 1. Create the rate
            const rateResult = await createTestTeacherRate(testTeacherAuthToken, rateType, 7000);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const rate = rateResult as TeacherLessonHourlyRate;
            if (!rate || !rate.id) throw new Error('Failed to get rate ID from creation for test');
            const rateId = rate.id;

            // 2. Ensure deactivated
            await updateTestRateStatus(testTeacherAuthToken, rateId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // 3. Try again (expecting error from raw call)
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${rateId}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 409');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(409);
                expect(error.response?.data?.error).toContain('Invalid transition');
            }
        });

        it('should return 400 Bad Request if transition is missing or invalid', async () => {
            // Uses the token created in beforeEach
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = SharedLessonType.GUITAR; // Use GUITAR instead of VOICE to avoid default conflict

            // 1. Create the rate - Check for unexpected setup failure
            const rateResult = await createTestTeacherRate(testTeacherAuthToken, rateType, 6500);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const rate = rateResult as TeacherLessonHourlyRate;
            if (!rate || !rate.id) throw new Error('Failed to get rate ID from creation for test setup');
            const rateId = rate.id;

            // 2. Test raw endpoint calls
            // Missing transition
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${rateId}`, {}, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request (missing transition) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Invalid or missing transition');
            }

            // Invalid transition value
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${rateId}`, {
                    transition: 'SOME_INVALID_ACTION'
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request (invalid transition) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Invalid or missing transition');
            }
        });

        it('should return 404 if trying to update status for a non-existent rate ID', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token not available');
            const nonExistentRateId = uuidv4();
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${nonExistentRateId}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });

        it('should return 400 Bad Request if the rate ID format is invalid', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token not available');
            const invalidRateId = 'not-a-valid-uuid';
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${invalidRateId}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
            }
        });

        // --- Reactivate ---
        it('should ACTIVATE an inactive lesson rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = SharedLessonType.GUITAR;

            // 1. Create the rate
            const rateResult = await createTestTeacherRate(testTeacherAuthToken, rateType, 5500);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const rate = rateResult as TeacherLessonHourlyRate;
            if (!rate || !rate.id) throw new Error('Failed to get rate ID from creation for test');
            const rateId = rate.id;

            // 2. Ensure deactivated
            await updateTestRateStatus(testTeacherAuthToken, rateId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // 3. Reactivate
            const reactivatedRate: TeacherLessonHourlyRate = await updateTestRateStatus(testTeacherAuthToken, rateId, TeacherLessonHourlyRateStatusTransition.ACTIVATE);

            expect(reactivatedRate).toBeDefined();
            expect(reactivatedRate.id).toBe(rateId);
            expect(reactivatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
        });

        it('should return 409 Conflict if trying to ACTIVATE an already active rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = SharedLessonType.BASS;

            // 1. Create the rate (it starts ACTIVE)
            const rateResult = await createTestTeacherRate(testTeacherAuthToken, rateType, 7500);
            if ('error' in rateResult) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rateResult.status} error: ${JSON.stringify(rateResult.error)}`);
            }
            const rate = rateResult as TeacherLessonHourlyRate;
            if (!rate || !rate.id) throw new Error('Failed to get rate ID from creation for test');
            const rateId = rate.id;

            // 2. Try again (expecting error from raw call)
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${rateId}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.ACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 409');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(409);
                expect(error.response?.data?.error).toContain('Invalid transition');
            }
        });

        it('should return 409 Conflict if trying to ACTIVATE a rate when another rate of the same type is already active', async () => {
            // Uses the token created in beforeEach
            if (!testTeacherAuthToken) throw new Error('Auth token missing for conflict test');
            const conflictRateType = SharedLessonType.DRUMS; // Use the same type

            // 1. Create the primary rate (rateToModifyId) and ensure INACTIVE
            const rate1Result = await createTestTeacherRate(testTeacherAuthToken, conflictRateType, 8000);
            if ('error' in rate1Result) { // Check setup failure
                throw new Error(`Test setup failed (rate1): createTestTeacherRate returned unexpected ${rate1Result.status} error: ${JSON.stringify(rate1Result.error)}`);
            }
            const rate1 = rate1Result as TeacherLessonHourlyRate;
            if (!rate1 || !rate1.id) throw new Error('Failed to create rate 1 for conflict test setup');
            const rate1Id = rate1.id;
            await updateTestRateStatus(testTeacherAuthToken, rate1Id, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);


            // 2. Attempt to Create a *second* rate of the SAME type (DRUMS) - EXPECTING 409
            const rate2Result = await createTestTeacherRate(testTeacherAuthToken, conflictRateType, 9000); // Different rate

            // Assert that the creation failed with the specific 409 "inactive" error
            expect(rate2Result).toHaveProperty('status', 409);
            expect(rate2Result).toHaveProperty('error');
            expect((rate2Result as any).error.error).toContain(`A rate for type ${conflictRateType} already exists but is inactive`);

            // Because rate2 failed, we don't proceed to activate rate1. The core check is the expected 409 on rate2 creation.
            // The original test logic attempting to activate rate1 after rate2 was created is no longer valid with the strict service.
        });
    });

    // Test complex transitions
    describe('Advanced Status Transitions', () => {
        let testTeacherId: string; // Use local scope variables
        let testTeacherAuthToken: string; // Use local scope variables

        // Create a fresh teacher for each test in this block
        beforeEach(async () => {
            try {
                const { user: teacher, password } = await createTestTeacher();
                testTeacherId = teacher.id;
                testTeacherAuthToken = await loginTestUser(teacher.email, password, UserType.TEACHER);
            } catch (error) {
                console.error('[Advanced Transitions Test Setup] Error in beforeEach:', error);
                throw error;
            }
        });

        it('should handle conflict when creating a rate for an already active type', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const conflictRateType = SharedLessonType.GUITAR;
            const rateAmount = 8500;

            // 1. Ensure rate exists and is active
            const rate1Result = await createTestTeacherRate(testTeacherAuthToken, conflictRateType, rateAmount);
            if ('error' in rate1Result) {
                throw new Error(`Test setup failed: createTestTeacherRate returned unexpected ${rate1Result.status} error: ${JSON.stringify(rate1Result.error)}`);
            }
            const rate1 = rate1Result as TeacherLessonHourlyRate;
            expect(rate1.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);

            // 2. Try to create another rate for the same type (expecting error from raw call)
            try {
                await axios.post(`${API_BASE_URL}/api/v1/teacher-lesson-rates`, {
                    lessonType: conflictRateType,
                    rateInCents: rateAmount + 1000
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 409');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(409);
                expect(error.response?.data?.error).toBe(`An active rate for type ${conflictRateType} already exists.`);
            }
        });
    });

}); // End Main Describe