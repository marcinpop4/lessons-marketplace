import { LessonStatusValue } from '@shared/models/LessonStatus'; // Import LessonStatusValue enum
import { UserType } from '@shared/models/UserType'; // Import UserType enum
import { LessonType } from '@shared/models/LessonType'; // Import SHARED LessonType
import axios from 'axios'; // Import axios
import { Teacher as SharedTeacher } from '@shared/models/Teacher'; // Import shared model for GET /:id

// Import test utilities
import { createTestTeacher, loginTestUser, createTestStudent } from '../utils/user.utils';
import { v4 as uuidv4 } from 'uuid';

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    // This check might be redundant if jest.setup.api.ts throws, but good practice
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Suite ---

describe('API Integration: /api/v1/teachers', () => {
    let testTeacherId: string | null = null;
    let testTeacherAuthToken: string | null = null; // Store raw token
    let testTeacherEmail: string | null = null; // Store email for profile check

    // Setup: Create and login a test testTeacher
    beforeAll(async () => {
        try {
            // Create teacher using utility - Use LessonType enum members
            const { user: teacher, password } = await createTestTeacher([
                { lessonType: LessonType.GUITAR, rateInCents: 5000 }, // Use shared LessonType
                { lessonType: LessonType.DRUMS, rateInCents: 6000 }  // Use shared LessonType
            ]);
            if (!teacher || !teacher.id || !teacher.email || !password) {
                throw new Error('Test setup failed: Could not create test teacher or get credentials.');
            }
            testTeacherId = teacher.id;
            testTeacherEmail = teacher.email;

            // Login using utility
            testTeacherAuthToken = await loginTestUser(teacher.email, password, UserType.TEACHER);
            // No Bearer prefix stored

        } catch (error) {
            console.error('[Teacher Test Setup] Error in beforeAll:', error);
            throw error; // Fail fast if setup fails
        }
    }, 30000);

    // No afterAll needed for user cleanup assuming test DB is reset

    // --- Tests for routes previously under /teachers/{teacherId}/... that were moved ---
    // These describe blocks can be removed or adapted if the routes still exist elsewhere
    /*
    describe('GET /api/v1/teachers/:teacherId/lessons/:lessonId/goals', () => {
        it.todo('should return 404 for a lesson that does not exist');
        it.todo('should return goals for a specific lesson associated with the teacher');
    });
    describe('POST /api/v1/teachers/:teacherId/lessons/:lessonId/goals', () => {});
    describe('PUT /api/v1/teachers/:teacherId/lessons/:lessonId/goals/:goalId', () => {});
    describe('DELETE /api/v1/teachers/:teacherId/lessons/:lessonId/goals/:goalId', () => {});
    */
    // --- End Moved Routes ---

    describe('GET /teachers', () => {
        it('should return a list of teachers (public access)', async () => {
            // This endpoint is public, no token needed
            const response = await axios.get(`${API_BASE_URL}/api/v1/teachers`, {
                params: { lessonType: LessonType.GUITAR, limit: 10 } // Use shared LessonType for query
            });
            // Note: This test might become less useful without predictable seed data
            // unless we ensure teachers with specific rates are created in setup.
            // For now, just check the status and basic structure.
            expect(response.status).toBe(200);
            const teachers: SharedTeacher[] = response.data; // Use response.data
            expect(Array.isArray(teachers)).toBe(true);
            if (teachers.length > 0) {
                expect(teachers[0]).not.toHaveProperty('passwordHash'); // Check sensitive data exclusion
            }
        });

        // Add tests for missing/invalid query params if applicable
        it('should return 400 if lessonType is missing', async () => {
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers`, {
                    params: { limit: 10 } // Missing lessonType
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message).toContain('Lesson type is required');
            }
        });

        it('should return 400 if limit is missing or invalid', async () => {
            // Case 1: Missing limit
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers`, {
                    params: { lessonType: LessonType.GUITAR } // Use shared LessonType
                });
                throw new Error('Request (missing limit) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message).toContain('Limit parameter is required');
            }

            // Case 2: Invalid limit (not a number)
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers`, {
                    params: { lessonType: LessonType.GUITAR, limit: 'abc' }
                });
                throw new Error('Request (invalid limit string) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message).toContain('Limit must be a positive number');
            }

            // Case 3: Invalid limit (zero)
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers`, {
                    params: { lessonType: LessonType.GUITAR, limit: 0 }
                });
                throw new Error('Request (invalid limit zero) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message).toContain('Limit must be a positive number');
            }

            // Case 4: Invalid limit (negative)
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers`, {
                    params: { lessonType: LessonType.GUITAR, limit: -5 }
                });
                throw new Error('Request (invalid limit negative) should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message).toContain('Limit must be a positive number');
            }
        });
    });

    describe('GET /teachers/:id', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!testTeacherId) throw new Error('Test teacher ID not available');
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers/${testTeacherId}`);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 200 OK if accessed by an authenticated user (e.g., student)', async () => {
            // Accessing another user's profile (GET /:id) only requires authentication
            if (!testTeacherId) throw new Error('Test teacher ID not available');
            const { user: student, password } = await createTestStudent();
            const studentToken = await loginTestUser(student.email, password, UserType.STUDENT);

            const response = await axios.get(`${API_BASE_URL}/api/v1/teachers/${testTeacherId}`, {
                headers: { 'Authorization': `Bearer ${studentToken}` }
            });
            expect(response.status).toBe(200);
            const teacher: SharedTeacher = response.data; // Use response.data
            // Check it returns *some* teacher data, but maybe not all fields if we later refine
            expect(teacher.id).toBe(testTeacherId);
        });

        it('should return the full teacher profile if authenticated as that teacher', async () => {
            if (!testTeacherAuthToken || !testTeacherId || !testTeacherEmail) {
                throw new Error('Test teacher auth info not available for profile test');
            }
            const response = await axios.get(`${API_BASE_URL}/api/v1/teachers/${testTeacherId}`, {
                headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
            });
            expect(response.status).toBe(200);
            const teacher: SharedTeacher = response.data; // Use response.data
            // Check fields from the full Teacher shared model
            expect(teacher.id).toBe(testTeacherId);
            expect(teacher.firstName).toBeDefined();
            expect(teacher.lastName).toBeDefined();
            expect(teacher.email).toBe(testTeacherEmail); // Email should be present now
            expect(teacher.phoneNumber).toBeDefined(); // Phone should be present
            expect(teacher.dateOfBirth).toBeDefined(); // DOB should be present (as ISO string)
            expect(teacher).toHaveProperty('hourlyRates'); // Rates should be present
            expect(Array.isArray(teacher.hourlyRates)).toBe(true);
            // Ensure sensitive fields are NOT present (Password hash handled by Prisma? No, by mapper)
            expect(teacher).not.toHaveProperty('passwordHash');
        });

        it('should return 404 Not Found if the teacher ID does not exist', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            const nonExistentId = uuidv4();
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers/${nonExistentId}`, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.error).toContain(`Teacher with ID ${nonExistentId} not found`);
            }
        });

        it('should return 400 Bad Request if the ID format is invalid', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            const invalidId = 'not-a-uuid';
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers/${invalidId}`, {
                    headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Invalid teacher ID format. Must be a valid UUID.');
            }
        });
    });

    describe('GET /teachers/stats', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await axios.get(`${API_BASE_URL}/api/v1/teachers/stats`);
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
                await axios.get(`${API_BASE_URL}/api/v1/teachers/stats`, {
                    headers: { 'Authorization': `Bearer ${studentToken}` }
                });
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
            }
        });

        it('should return statistics for the authenticated teacher', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            // Note: Stats might be 0 if no lessons/goals are created for this dynamic teacher
            // Consider creating some lessons/goals in beforeAll if specific stats are needed
            const response = await axios.get(`${API_BASE_URL}/api/v1/teachers/stats`, {
                headers: { 'Authorization': `Bearer ${testTeacherAuthToken}` }
            });
            expect(response.status).toBe(200);
            const stats: any = response.data; // Use any type for now
            expect(stats).toHaveProperty('totalLessons');
            expect(stats).toHaveProperty('completedLessons');
            expect(stats).toHaveProperty('upcomingLessons');
            expect(stats).toHaveProperty('totalEarnings');
            // Check types are numbers
            expect(typeof stats.totalLessons).toBe('number');
            expect(typeof stats.completedLessons).toBe('number');
            expect(typeof stats.totalEarnings).toBe('number');
        });
    });

}); 