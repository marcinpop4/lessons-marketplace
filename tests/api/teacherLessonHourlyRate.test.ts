import { LessonType, Prisma } from '@prisma/client';
import { UserType } from '@shared/models/UserType';
import { TeacherLessonHourlyRateStatusValue, TeacherLessonHourlyRateStatusTransition } from '@shared/models/TeacherLessonHourlyRateStatus';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate'; // Import shared model
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
    let testTeacherId: string | null = null;
    let testTeacherAuthToken: string | null = null; // Raw token

    // Setup: Create and login a test teacher
    beforeAll(async () => {
        try {
            const { user: teacher, password } = await createTestTeacher();
            if (!teacher || !teacher.id || !teacher.email || !password) {
                throw new Error('Test setup failed: Could not create test teacher or get credentials.');
            }
            testTeacherId = teacher.id;
            testTeacherAuthToken = await loginTestUser(teacher.email, password, UserType.TEACHER);
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

            // Use utility
            const createdRate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, testRateType, testRateAmount);

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
            const updatedRate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, testRateType, newRateAmount);

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
        it('should create an active rate and return 200', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            // Use utility - returns shared model
            const rate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, LessonType.DRUMS, 8000);
            expect(rate.teacherId).toBe(testTeacherId);
            expect(rate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
            expect(rate.type).toBe(LessonType.DRUMS);
            expect(rate.rateInCents).toBe(8000);
        });

        it('should DEACTIVATE an active lesson rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');

            // --- Create and Deactivate within the test ---
            // 1. Create the rate directly within this test
            const rate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, LessonType.DRUMS, 8000);
            if (!rate || !rate.id) {
                throw new Error('Failed to create rate within the test');
            }
            const rateToDeactivateId = rate.id;
            expect(rate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE); // Verify initial state

            // 2. Immediately try to deactivate using the utility
            const deactivatedRate: TeacherLessonHourlyRate = await updateTestRateStatus(testTeacherAuthToken, rateToDeactivateId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // 3. Assertions
            expect(deactivatedRate).toBeDefined();
            expect(deactivatedRate.id).toBe(rateToDeactivateId);
            expect(deactivatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.INACTIVE);
        });

        it('should return 409 Conflict if trying to DEACTIVATE an already inactive rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = LessonType.BASS; // Use a valid type like BASS

            // 1. Create the rate
            const rate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, rateType, 7000);
            if (!rate || !rate.id) throw new Error('Failed to create rate for test');
            const rateId = rate.id;

            // 2. Ensure deactivated using utility
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
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = LessonType.VOICE; // Use a valid type like VOICE

            // 1. Create the rate
            const rate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, rateType, 6500);
            if (!rate || !rate.id) throw new Error('Failed to create rate for test');
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
                // Test raw endpoint call
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${nonExistentRateId}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                // Removed check for specific error message as 404 body might be empty
            }
        });

        it('should return 400 Bad Request if the rate ID format is invalid', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token not available');
            const invalidRateId = 'not-a-valid-uuid';
            try {
                // Test raw endpoint call
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${invalidRateId}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.DEACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400); // Expect 400 from validation
            }
        });

        // --- Reactivate ---
        it('should ACTIVATE an inactive lesson rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = LessonType.GUITAR;

            // 1. Create the rate
            const rate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, rateType, 5500);
            if (!rate || !rate.id) throw new Error('Failed to create rate for test');
            const rateId = rate.id;

            // 2. Ensure deactivated using utility
            await updateTestRateStatus(testTeacherAuthToken, rateId, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);

            // 3. Reactivate using utility
            const reactivatedRate: TeacherLessonHourlyRate = await updateTestRateStatus(testTeacherAuthToken, rateId, TeacherLessonHourlyRateStatusTransition.ACTIVATE);

            expect(reactivatedRate).toBeDefined();
            expect(reactivatedRate.id).toBe(rateId);
            expect(reactivatedRate.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);
        });

        it('should return 409 Conflict if trying to ACTIVATE an already active rate', async () => {
            if (!testTeacherAuthToken) throw new Error('Auth token missing');
            const rateType = LessonType.BASS; // Reuse type from POST tests

            // 1. Create the rate (it starts ACTIVE)
            const rate: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, rateType, 7500);
            if (!rate || !rate.id) throw new Error('Failed to create rate for test');
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
            if (!testTeacherAuthToken) throw new Error('Auth token missing for conflict test');
            const conflictRateType = LessonType.DRUMS; // Use the same type

            // 1. Create the primary rate (rateToModifyId) and ensure INACTIVE
            const rate1: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, conflictRateType, 8000);
            if (!rate1 || !rate1.id) throw new Error('Failed to create rate 1 for conflict test');
            const rate1Id = rate1.id;
            await updateTestRateStatus(testTeacherAuthToken, rate1Id, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);


            // 2. Create a *second* rate of the SAME type (DRUMS) using utility
            const rate2: TeacherLessonHourlyRate = await createTestTeacherRate(testTeacherAuthToken, conflictRateType, 9000); // Different rate
            if (!rate2 || !rate2.id) throw new Error('Failed to create rate 2 for conflict test');
            const rate2Id = rate2.id;
            // Verify rate 2 is active
            expect(rate2.currentStatus?.status).toBe(TeacherLessonHourlyRateStatusValue.ACTIVE);

            // 3. Attempt to ACTIVATE the original (now INACTIVE) rate (raw call to check error)
            try {
                await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${rate1Id}`, {
                    transition: TeacherLessonHourlyRateStatusTransition.ACTIVATE
                }, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 409');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(409);
                expect(error.response?.data?.error).toContain(`Cannot activate rate: Another rate for type ${conflictRateType} is already active`);
            }

            // Cleanup: Deactivate the second rate using utility (optional but good practice)
            // await updateTestRateStatus(testTeacherAuthToken, rate2Id, TeacherLessonHourlyRateStatusTransition.DEACTIVATE);
        });
    });
}); 