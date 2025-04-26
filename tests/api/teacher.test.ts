import request from 'supertest';
// We only need Prisma types now, not the client
import { Teacher, Student, Address, LessonRequest, LessonQuote, Lesson, LessonStatus, LessonType } from '@prisma/client';
import { LessonStatusValue } from '@shared/models/LessonStatus'; // Import LessonStatusValue enum
import { UserType } from '@shared/models/UserType'; // Import UserType enum

// Import test utilities
import { createTestTeacher, loginTestUser, createTestStudent } from './utils/user.utils';
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
    let testTeacherAuthToken: string | null = null;
    let testTeacherEmail: string | null = null; // Store email for profile check

    // Setup: Create and login a test teacher
    beforeAll(async () => {
        try {
            // Create teacher using utility
            const { user: teacher, password } = await createTestTeacher();
            if (!teacher || !teacher.id || !teacher.email || !password) {
                throw new Error('Test setup failed: Could not create test teacher or get credentials.');
            }
            testTeacherId = teacher.id;
            testTeacherEmail = teacher.email;

            // Login using utility
            const token = await loginTestUser(teacher.email, password, UserType.TEACHER);
            testTeacherAuthToken = `Bearer ${token}`;

            console.log(`[Teacher Tests Setup] Created Teacher ID: ${testTeacherId}`);

            // Note: If tests rely on specific *rates* existing (like VOICE/GUITAR for update/deactivate), 
            // we need to create them here after the teacher is created, potentially using 
            // a new utility function or direct API calls within this beforeAll.
            // For now, assuming tests adapt or create rates as needed.

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
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ lessonType: LessonType.GUITAR, limit: 10 }); // Query requires rates exist
            // Note: This test might become less useful without predictable seed data 
            // unless we ensure teachers with specific rates are created in setup.
            // For now, just check the status and basic structure.
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            if (response.body.length > 0) {
                expect(response.body[0]).not.toHaveProperty('passwordHash'); // Check sensitive data exclusion
            }
        });
        // Add tests for missing/invalid query params if applicable
        it('should return 400 if lessonType is missing', async () => {
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ limit: 10 }); // Missing lessonType
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Lesson type is required');
        });

        it('should return 400 if limit is missing or invalid', async () => {
            // Case 1: Missing limit
            let response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ lessonType: LessonType.GUITAR }); // Missing limit
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Limit parameter is required');

            // Case 2: Invalid limit (not a number)
            response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ lessonType: LessonType.GUITAR, limit: 'abc' });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Limit must be a positive number');

            // Case 3: Invalid limit (zero)
            response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ lessonType: LessonType.GUITAR, limit: 0 });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Limit must be a positive number');

            // Case 4: Invalid limit (negative)
            response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ lessonType: LessonType.GUITAR, limit: -5 });
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Limit must be a positive number');
        });
    });

    describe('GET /teachers/:id', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!testTeacherId) throw new Error('Test teacher ID not available');
            const response = await request(API_BASE_URL!).get(`/api/v1/teachers/${testTeacherId}`);
            expect(response.status).toBe(401);
        });

        it('should return 200 OK if accessed by an authenticated user (e.g., student)', async () => {
            // Accessing another user's profile (GET /:id) only requires authentication
            if (!testTeacherId) throw new Error('Test teacher ID not available');
            const { user: student, password } = await createTestStudent();
            const studentToken = await loginTestUser(student.email, password, UserType.STUDENT);

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${testTeacherId}`)
                .set('Authorization', `Bearer ${studentToken}`);
            expect(response.status).toBe(200);
            // Check it returns *some* teacher data, but maybe not all fields if we later refine
            expect(response.body.id).toBe(testTeacherId);
        });

        it('should return the full teacher profile if authenticated as that teacher', async () => {
            if (!testTeacherAuthToken || !testTeacherId || !testTeacherEmail) {
                throw new Error('Test teacher auth info not available for profile test');
            }
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${testTeacherId}`)
                .set('Authorization', testTeacherAuthToken);
            expect(response.status).toBe(200);
            // Check fields from the full Teacher shared model
            expect(response.body.id).toBe(testTeacherId);
            expect(response.body.firstName).toBeDefined();
            expect(response.body.lastName).toBeDefined();
            expect(response.body.email).toBe(testTeacherEmail); // Email should be present now
            expect(response.body.phoneNumber).toBeDefined(); // Phone should be present
            expect(response.body.dateOfBirth).toBeDefined(); // DOB should be present (as ISO string)
            expect(response.body).toHaveProperty('hourlyRates'); // Rates should be present
            expect(Array.isArray(response.body.hourlyRates)).toBe(true);
            // Ensure sensitive fields are NOT present (Password hash handled by Prisma? No, by mapper)
            expect(response.body).not.toHaveProperty('passwordHash');
        });

        it('should return 404 Not Found if the teacher ID does not exist', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            const nonExistentId = uuidv4();
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${nonExistentId}`)
                .set('Authorization', testTeacherAuthToken);
            expect(response.status).toBe(404);
            expect(response.body.error).toContain(`Teacher with ID ${nonExistentId} not found`);
        });

        it('should return 400 Bad Request if the ID format is invalid', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            const invalidId = 'not-a-uuid';
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${invalidId}`)
                .set('Authorization', testTeacherAuthToken);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid teacher ID format. Must be a valid UUID.');
        });
    });

    describe('GET /teachers/stats', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!).get('/api/v1/teachers/stats');
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if accessed by a student', async () => {
            const { user: student, password } = await createTestStudent();
            const studentToken = await loginTestUser(student.email, password, UserType.STUDENT);
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/stats')
                .set('Authorization', `Bearer ${studentToken}`);
            expect(response.status).toBe(403);
        });

        it('should return statistics for the authenticated teacher', async () => {
            if (!testTeacherAuthToken) throw new Error('Test teacher auth token not available');
            // Note: Stats might be 0 if no lessons/goals are created for this dynamic teacher
            // Consider creating some lessons/goals in beforeAll if specific stats are needed
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/stats')
                .set('Authorization', testTeacherAuthToken);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('totalLessons');
            expect(response.body).toHaveProperty('completedLessons');
            expect(response.body).toHaveProperty('upcomingLessons');
            expect(response.body).toHaveProperty('totalEarnings');
            // Check types are numbers
            expect(typeof response.body.totalLessons).toBe('number');
            expect(typeof response.body.completedLessons).toBe('number');
            expect(typeof response.body.totalEarnings).toBe('number');
        });
    });

}); 