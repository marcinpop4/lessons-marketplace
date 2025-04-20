import request from 'supertest';
// We only need Prisma types now, not the client
import { Teacher, Student, Address, LessonRequest, LessonQuote, Lesson, LessonStatus, LessonType } from '@prisma/client';

// --- Seed Data Constants ---
// Use credentials matching a user created in server/prisma/seed.js
const SEEDED_TEACHER_EMAIL = 'emily.richardson@musicschool.com';
const SEEDED_PASSWORD = '1234'; // Password used in seed.js

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    // This check might be redundant if jest.setup.api.ts throws, but good practice
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Suite --- 

describe('API Integration: /api/v1/teachers using Seed Data', () => {
    let seededTeacherId: string | null = null;
    let seededTeacherAuthToken: string | null = null;

    beforeAll(async () => {
        try {
            const loginResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({
                    email: SEEDED_TEACHER_EMAIL,
                    password: SEEDED_PASSWORD,
                    userType: 'TEACHER'
                });

            if (loginResponse.status !== 200 || !loginResponse.body.accessToken || !loginResponse.body.user?.id) {
                console.error('Failed Seeded Teacher Login Response:', loginResponse.status, loginResponse.body);
                throw new Error(`Failed to log in as seeded teacher ${SEEDED_TEACHER_EMAIL}: ${loginResponse.body.error || 'Login endpoint failed'}`);
            }

            seededTeacherId = loginResponse.body.user.id;
            seededTeacherAuthToken = `Bearer ${loginResponse.body.accessToken}`;

        } catch (error) {
            console.error('[Test Setup] Error logging in as seeded teacher:', error);
            throw error; // Fail fast if login doesn't work
        }
    }, 30000); // Timeout for login request

    // No afterAll needed as prisma:reset handles cleanup

    describe('GET /:teacherId/lessons', () => {

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!seededTeacherId) throw new Error('Seeded teacher ID not available');
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons`);
            expect(response.status).toBe(401);
        });

        it('should return lessons for the authenticated seeded teacher without passwords', async () => {
            if (!seededTeacherId || !seededTeacherAuthToken) throw new Error('Seeded teacher auth info not available');

            // Act: Make request to the RUNNING server
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons`)
                .set('Authorization', seededTeacherAuthToken);

            // Assert: Status and basic structure
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(Array.isArray(response.body)).toBe(true);

            // Assert: All returned lessons belong to the correct teacher and have no passwords
            if (response.body.length > 0) {
                for (const lesson of response.body) {
                    // Check ownership
                    expect(lesson.quote?.teacher?.id).toBeDefined();
                    expect(lesson.quote?.teacher?.id).toEqual(seededTeacherId);

                    // Check teacher password sanitization
                    expect(lesson.quote?.teacher).not.toHaveProperty('password');

                    // Check student password sanitization (if student data is present)
                    if (lesson.quote?.lessonRequest?.student) {
                        expect(lesson.quote.lessonRequest.student).not.toHaveProperty('password');
                    }
                }
            } else {
                // Test still passes if no lessons are returned, as the endpoint worked correctly.
            }
        });

        it('should return 403 if requesting lessons for a different teacher ID', async () => {
            if (!seededTeacherAuthToken) throw new Error('Seeded teacher auth token not available');
            const otherTeacherId = 'some-other-teacher-id-not-seeded'; // An ID that doesn't match the token

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${otherTeacherId}/lessons`)
                .set('Authorization', seededTeacherAuthToken);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Forbidden');
        });
    });
}); 