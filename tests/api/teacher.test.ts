import request from 'supertest';
// We only need Prisma types now, not the client
import { Teacher, Student, Address, LessonRequest, LessonQuote, Lesson, LessonStatus, LessonType } from '@prisma/client';
import { LessonStatusValue } from '@shared/models/LessonStatus'; // Import LessonStatusValue enum

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

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons`)
                .set('Authorization', seededTeacherAuthToken);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            if (response.body.length > 0) {
                for (const lesson of response.body) {
                    // Check ownership (teacher ID is directly on the lesson's teacher object now)
                    expect(lesson.teacher?.id).toBeDefined();
                    expect(lesson.teacher?.id).toEqual(seededTeacherId);

                    // Check teacher object doesn't have password (it shouldn't as it comes from shared model)
                    expect(lesson.teacher).not.toHaveProperty('password');

                    // Check student object doesn't have password (it shouldn't as it comes from shared model)
                    if (lesson.student) {
                        expect(lesson.student).not.toHaveProperty('password');
                    }
                }
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

        it('should return lessons for the authenticated seeded teacher with correct structure and goal counts', async () => {
            if (!seededTeacherId || !seededTeacherAuthToken) throw new Error('Seeded teacher auth info not available');

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons`)
                .set('Authorization', seededTeacherAuthToken);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            // expect(response.body.length).toBe(31); // Seed data might change, check > 0 instead?
            expect(response.body.length).toBeGreaterThan(0);

            response.body.forEach((lesson: any) => {
                // --- Top-Level Lesson Properties ---
                expect(lesson).toHaveProperty('id');
                expect(lesson).toHaveProperty('type'); // Check type is present
                expect(lesson).toHaveProperty('startTime');
                expect(lesson).toHaveProperty('durationMinutes');
                expect(lesson).toHaveProperty('costInCents');
                expect(lesson).toHaveProperty('currentStatus'); // The status string
                expect(lesson).toHaveProperty('currentStatusId'); // The status ID
                expect(lesson).toHaveProperty('createdAt');
                expect(lesson).toHaveProperty('updatedAt');
                expect(lesson).toHaveProperty('goalCount');
                expect(lesson).not.toHaveProperty('quote'); // Ensure quote object is NOT returned

                // --- Nested Object Properties (Flattened) ---
                expect(lesson).toHaveProperty('teacher');
                expect(lesson.teacher).toHaveProperty('id');
                expect(lesson.teacher).toHaveProperty('firstName');
                expect(lesson.teacher).toHaveProperty('lastName');
                expect(lesson.teacher).toHaveProperty('email'); // Assuming email is intended
                expect(lesson.teacher).not.toHaveProperty('password');

                expect(lesson).toHaveProperty('student');
                expect(lesson.student).toHaveProperty('id');
                expect(lesson.student).toHaveProperty('firstName');
                expect(lesson.student).toHaveProperty('lastName');
                expect(lesson.student).not.toHaveProperty('password');
                // expect(lesson.student).toHaveProperty('email'); // Decide if student email needed

                expect(lesson).toHaveProperty('address');
                expect(lesson.address).toHaveProperty('street');
                expect(lesson.address).toHaveProperty('city');
                // expect(lesson.address).toHaveProperty('state'); // State might not be in shared model Address.ts
                expect(lesson.address).toHaveProperty('postalCode');
                expect(lesson.address).toHaveProperty('country');

                // --- Type/Value Checks ---
                expect(typeof lesson.currentStatus).toBe('string');
                expect(lesson.type).toMatch(/^(GUITAR|BASS|DRUMS|VOICE|PIANO)$/);
                expect(Object.values(LessonStatusValue)).toContain(lesson.currentStatus);
            });
        });

        it('should filter lessons by studentId when provided', async () => {
            if (!seededTeacherId || !seededTeacherAuthToken) throw new Error('Seeded teacher auth info not available');

            // First get all lessons to find a valid student ID
            const allLessonsResponse = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons`)
                .set('Authorization', seededTeacherAuthToken);

            expect(allLessonsResponse.status).toBe(200);
            expect(Array.isArray(allLessonsResponse.body)).toBe(true);
            expect(allLessonsResponse.body.length).toBeGreaterThan(0);

            // Get a student ID from the first lesson's flattened student object
            const studentId = allLessonsResponse.body[0].student?.id;
            expect(studentId).toBeDefined();

            // Now get lessons filtered by this student ID
            const filteredResponse = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons?studentId=${studentId}`)
                .set('Authorization', seededTeacherAuthToken);

            expect(filteredResponse.status).toBe(200);
            expect(Array.isArray(filteredResponse.body)).toBe(true);
            expect(filteredResponse.body.length).toBeGreaterThan(0);

            // Verify all returned lessons are for the specified student
            filteredResponse.body.forEach((lesson: any) => {
                expect(lesson.student?.id).toBe(studentId);
            });

            // Verify the filtered results are a subset of all lessons
            expect(filteredResponse.body.length).toBeLessThanOrEqual(allLessonsResponse.body.length);
        });

        it('should return empty array when filtering by non-existent studentId', async () => {
            if (!seededTeacherId || !seededTeacherAuthToken) throw new Error('Seeded teacher auth info not available');

            const nonExistentStudentId = 'non-existent-id';
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/teachers/${seededTeacherId}/lessons?studentId=${nonExistentStudentId}`)
                .set('Authorization', seededTeacherAuthToken);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });
    });

    // --- GET /api/v1/teachers/:teacherId/lessons/:lessonId/goals ---
    describe('GET /api/v1/teachers/:teacherId/lessons/:lessonId/goals', () => {
        // ... potentially add tests here in the future ...
        it('should return 404 for a lesson that does not exist', async () => {
            // Placeholder for future test
        });
        it('should return goals for a specific lesson associated with the teacher', async () => {
            // Placeholder for future test
        });
    });

    // --- POST /api/v1/teachers/:teacherId/lessons/:lessonId/goals ---
    describe('POST /api/v1/teachers/:teacherId/lessons/:lessonId/goals', () => {
        // Placeholder for future tests
    });

    // --- PUT /api/v1/teachers/:teacherId/lessons/:lessonId/goals/:goalId ---
    describe('PUT /api/v1/teachers/:teacherId/lessons/:lessonId/goals/:goalId', () => {
        // Placeholder for future tests
    });

    // --- DELETE /api/v1/teachers/:teacherId/lessons/:lessonId/goals/:goalId ---
    describe('DELETE /api/v1/teachers/:teacherId/lessons/:lessonId/goals/:goalId', () => {
        // Placeholder for future tests
    });

    // --- New Tests Start Here ---

    describe('GET /teachers', () => {
        it('should return a list of teachers (public access)', async () => {
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers')
                .query({ lessonType: LessonType.GUITAR, limit: 10 });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            // Ensure passwords are not returned
            if (response.body.length > 0) {
                expect(response.body[0]).not.toHaveProperty('password');
            }
            // You might want to add checks for specific seeded teachers if needed
        });

        // TODO: Add test for filtering if implemented (e.g., by lesson type)
    });

    describe('GET /teachers/profile', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/profile');
            expect(response.status).toBe(401);
        });

        // Need to log in as a student to test role check
        it('should return 403 Forbidden if accessed by a student', async () => {
            // Login as a known student (adjust email/password if needed)
            const studentLogin = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: 'ethan.parker@example.com', password: '1234', userType: 'STUDENT' });

            expect(studentLogin.status).toBe(200);
            const studentToken = `Bearer ${studentLogin.body.accessToken}`;

            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/profile')
                .set('Authorization', studentToken);
            expect(response.status).toBe(403);
        });

        it('should return the authenticated teacher\'s profile', async () => {
            if (!seededTeacherAuthToken) throw new Error('Seeded teacher auth token not available');

            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/profile')
                .set('Authorization', seededTeacherAuthToken);

            expect(response.status).toBe(200);
            expect(response.body.email).toBe(SEEDED_TEACHER_EMAIL);
            expect(response.body.id).toBe(seededTeacherId);
            expect(response.body).not.toHaveProperty('password');
        });
    });

    describe('POST /teachers/lesson-rates', () => {
        let createdRateId: string | null = null;

        afterAll(async () => {
            // Clean up created rate if test fails mid-way
            if (createdRateId && seededTeacherAuthToken) {
                // Using deactivate as a proxy for deletion if no delete exists
                await request(API_BASE_URL!)
                    .post('/api/v1/teachers/lesson-rates/deactivate')
                    .set('Authorization', seededTeacherAuthToken)
                    .send({ lessonRateId: createdRateId });
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates')
                .send({ lessonType: LessonType.GUITAR, rateInCents: 5000 });
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if accessed by a student', async () => {
            // Login as a known student
            const studentLogin = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: 'ethan.parker@example.com', password: '1234', userType: 'STUDENT' });
            const studentToken = `Bearer ${studentLogin.body.accessToken}`;

            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates')
                .set('Authorization', studentToken)
                .send({ lessonType: LessonType.GUITAR, rateInCents: 5000 });
            expect(response.status).toBe(403);
        });

        it('should return 400 Bad Request if data is missing', async () => {
            if (!seededTeacherAuthToken) throw new Error('Seeded teacher auth token not available');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates')
                .set('Authorization', seededTeacherAuthToken)
                .send({ lessonType: LessonType.GUITAR }); // Missing rateInCents
            expect(response.status).toBe(400);
        });

        // Test UPDATE instead of CREATE due to seed data already creating rates
        it('should UPDATE an existing lesson rate for the authenticated teacher', async () => {
            if (!seededTeacherAuthToken) throw new Error('Seeded teacher auth token not available');

            // 1. Get the ID of the existing GUITAR rate from the profile
            const profileResponse = await request(API_BASE_URL!)
                .get('/api/v1/teachers/profile')
                .set('Authorization', seededTeacherAuthToken);
            expect(profileResponse.status).toBe(200);
            const guitarRate = profileResponse.body.lessonRates?.find((rate: any) => rate.type === LessonType.GUITAR);
            if (!guitarRate || !guitarRate.id) {
                throw new Error(`Could not find existing GUITAR lesson rate for teacher ${SEEDED_TEACHER_EMAIL} in seed data.`);
            }
            const existingGuitarRateId = guitarRate.id;
            const originalRateInCents = guitarRate.rateInCents;
            const updatedRateInCents = originalRateInCents + 500; // New rate

            // 2. Prepare update data including the ID
            const rateUpdateData = {
                id: existingGuitarRateId,
                lessonType: LessonType.GUITAR,
                rateInCents: updatedRateInCents
            };

            // 3. Send POST request to update
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates')
                .set('Authorization', seededTeacherAuthToken)
                .send(rateUpdateData);

            // 4. Assertions for UPDATE
            expect(response.status).toBe(200); // Expect 200 OK for update
            expect(response.body.id).toBe(existingGuitarRateId);
            expect(response.body.teacherId).toBe(seededTeacherId);
            expect(response.body.type).toBe(rateUpdateData.lessonType);
            expect(response.body.rateInCents).toBe(rateUpdateData.rateInCents);
            expect(response.body.rateInCents).not.toBe(originalRateInCents); // Ensure rate changed
            expect(response.body.isActive).toBe(true); // Assuming update doesn't deactivate

            // Optional: clean up by resetting the rate back? Or rely on prisma:reset
        });

        // TODO: Test creating a rate for a type NOT included in seed data?
    });

    describe('POST /teachers/lesson-rates/deactivate & reactivate', () => {
        let rateToModifyId: string | null = null;

        beforeAll(async () => {
            // Fetch the existing VOICE rate ID created by the seed script
            if (!seededTeacherAuthToken) throw new Error('Seeded teacher auth token not available');
            try {
                const profileResponse = await request(API_BASE_URL!)
                    .get('/api/v1/teachers/profile')
                    .set('Authorization', seededTeacherAuthToken);

                if (profileResponse.status !== 200 || !profileResponse.body.lessonRates) {
                    throw new Error('Failed to fetch teacher profile or lesson rates in beforeAll');
                }

                const voiceRate = profileResponse.body.lessonRates.find((rate: any) => rate.type === LessonType.VOICE);

                if (!voiceRate || !voiceRate.id) {
                    throw new Error(`Could not find existing VOICE lesson rate for teacher ${SEEDED_TEACHER_EMAIL} in seed data.`);
                }

                rateToModifyId = voiceRate.id;
                console.log(`[Test Setup] Found existing VOICE rate ID: ${rateToModifyId} for de/reactivate tests.`);

                // Ensure the rate is active before tests run (in case previous run left it deactivated)
                if (!voiceRate.isActive) {
                    console.log(`[Test Setup] Reactivating VOICE rate ${rateToModifyId} before tests.`);
                    await request(API_BASE_URL!)
                        .post('/api/v1/teachers/lesson-rates/reactivate')
                        .set('Authorization', seededTeacherAuthToken)
                        .send({ lessonRateId: rateToModifyId });
                }

            } catch (error) {
                console.error('[Test Setup Error] Failed to get existing VOICE rate ID:', error);
                throw error; // Fail fast if setup fails
            }
        });

        // Deactivate
        it('should deactivate an existing lesson rate', async () => {
            if (!seededTeacherAuthToken || !rateToModifyId) throw new Error('Test setup failed');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates/deactivate')
                .set('Authorization', seededTeacherAuthToken)
                .send({ lessonRateId: rateToModifyId });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(rateToModifyId);
            expect(response.body.isActive).toBe(false);
        });

        it('should return 404 if trying to deactivate a non-existent rate', async () => {
            if (!seededTeacherAuthToken) throw new Error('Test setup failed');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates/deactivate')
                .set('Authorization', seededTeacherAuthToken)
                .send({ lessonRateId: 'non-existent-rate-id' });
            expect(response.status).toBe(404);
        });

        // Reactivate
        it('should reactivate a previously deactivated lesson rate', async () => {
            if (!seededTeacherAuthToken || !rateToModifyId) throw new Error('Test setup failed');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates/reactivate')
                .set('Authorization', seededTeacherAuthToken)
                .send({ lessonRateId: rateToModifyId });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(rateToModifyId);
            expect(response.body.isActive).toBe(true);
        });

        it('should return 404 if trying to reactivate a non-existent rate', async () => {
            if (!seededTeacherAuthToken) throw new Error('Test setup failed');
            const response = await request(API_BASE_URL!)
                .post('/api/v1/teachers/lesson-rates/reactivate')
                .set('Authorization', seededTeacherAuthToken)
                .send({ lessonRateId: 'non-existent-rate-id' });
            expect(response.status).toBe(404);
        });

        // TODO: Add tests for 401 Unauthorized and 403 Forbidden for both endpoints
    });

    describe('GET /teachers/stats', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/stats');
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if accessed by a student', async () => {
            // Login as a known student
            const studentLogin = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: 'ethan.parker@example.com', password: '1234', userType: 'STUDENT' });
            const studentToken = `Bearer ${studentLogin.body.accessToken}`;

            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/stats')
                .set('Authorization', studentToken);
            expect(response.status).toBe(403);
        });

        it('should return statistics for the authenticated teacher', async () => {
            if (!seededTeacherAuthToken) throw new Error('Seeded teacher auth token not available');

            const response = await request(API_BASE_URL!)
                .get('/api/v1/teachers/stats')
                .set('Authorization', seededTeacherAuthToken);

            expect(response.status).toBe(200);
            // Check for expected statistic properties (adjust names based on service implementation)
            expect(response.body).toHaveProperty('totalLessons');
            expect(response.body).toHaveProperty('completedLessons');
            expect(response.body).toHaveProperty('upcomingLessons');
            expect(response.body).toHaveProperty('totalEarnings');
            // Add more specific value checks if the seed data allows for predictable stats
        });
    });

    // --- End of New Tests ---

}); 