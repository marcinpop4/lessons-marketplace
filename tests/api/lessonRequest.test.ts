import request from 'supertest';
// Import necessary SHARED MODELS for response type checking
import { LessonRequest } from '@shared/models/LessonRequest';
import { Student } from '@shared/models/Student';
import { Address } from '@shared/models/Address';
// Import Prisma types ONLY for things used in the request payload (like enums)
import { LessonType } from '@prisma/client';

// --- Seed Data Constants ---
// Use credentials matching a user created in server/prisma/seed.js
const SEEDED_STUDENT_EMAIL = 'ethan.parker@example.com'; // Student from seed.js
const SEEDED_PASSWORD = '1234'; // Password used in seed.js

// Base URL for the running server (Loaded via jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

// --- Test Suite ---

describe('API Integration: /api/v1/lessonRequests using Seed Data', () => {
    let seededStudentId: string | null = null;
    let seededStudentAuthToken: string | null = null;

    // --- Authentication Setup ---
    beforeAll(async () => {
        try {
            const loginResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({
                    email: SEEDED_STUDENT_EMAIL,
                    password: SEEDED_PASSWORD,
                    userType: 'STUDENT' // Log in as STUDENT
                });

            if (loginResponse.status !== 200 || !loginResponse.body.accessToken || !loginResponse.body.user?.id) {
                throw new Error(`Failed to log in as seeded student ${SEEDED_STUDENT_EMAIL}: ${loginResponse.body.error || 'Login endpoint failed'}`);
            }

            seededStudentId = loginResponse.body.user.id;
            seededStudentAuthToken = `Bearer ${loginResponse.body.accessToken}`;

        } catch (error) {
            throw error; // Fail fast if login doesn't work
        }
    }, 30000); // Timeout for login request

    // --- Test Cases for POST /api/v1/lessonRequests ---
    describe('POST /lessonRequests', () => {

        // --- Success Case ---
        it('should create a new lesson request successfully (201)', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // Request a lesson a week from now
            futureDate.setHours(14, 0, 0, 0); // At 2 PM

            const newLessonRequestData = {
                studentId: seededStudentId, // Use the authenticated student's ID
                addressObj: {
                    street: '99 Test Lane',
                    city: 'Testville',
                    state: 'TS',
                    postalCode: '12345',
                    country: 'Testland'
                },
                type: LessonType.GUITAR, // Example lesson type
                startTime: futureDate.toISOString(), // Must be ISO string
                durationMinutes: 60
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(newLessonRequestData);

            // Assert Status Code
            expect(response.status).toBe(201); // Created
            expect(response.headers['content-type']).toMatch(/application\/json/);

            // Assert Response Body Structure and Data
            const createdRequest: LessonRequest = response.body.lessonRequest;
            expect(createdRequest).toBeDefined();
            expect(createdRequest.id).toBeDefined(); // Should have a generated ID
            expect(createdRequest.student.id).toEqual(seededStudentId);
            expect(createdRequest.type).toEqual(newLessonRequestData.type);
            expect(new Date(createdRequest.startTime).toISOString()).toEqual(newLessonRequestData.startTime);
            expect(createdRequest.durationMinutes).toEqual(newLessonRequestData.durationMinutes);

            // Assert Address was created and linked
            expect(createdRequest.address).toBeDefined();
            expect(createdRequest.address.id).toBeDefined();
            expect(createdRequest.address.street).toEqual(newLessonRequestData.addressObj.street);
            expect(createdRequest.address.city).toEqual(newLessonRequestData.addressObj.city);
            expect(createdRequest.address.state).toEqual(newLessonRequestData.addressObj.state);
            expect(createdRequest.address.postalCode).toEqual(newLessonRequestData.addressObj.postalCode);
            expect(createdRequest.address.country).toEqual(newLessonRequestData.addressObj.country);


            // Assert Student relation is present but password is removed
            expect(createdRequest.student).toBeDefined();
            expect(createdRequest.student.id).toEqual(seededStudentId);
            expect(createdRequest.student).not.toHaveProperty('password');

        });

        // --- Error Cases ---

        it('should return 401 Unauthorized if no token is provided', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            futureDate.setHours(14, 0, 0, 0);

            const newLessonRequestData = { /* ... valid data ... */
                studentId: 'any-student-id', // Doesn't matter as it's unauthorized
                addressObj: { street: '1 Test St', city: 'Test', state: 'TS', postalCode: '111', country: 'Test' },
                type: LessonType.DRUMS,
                startTime: futureDate.toISOString(),
                durationMinutes: 45
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .send(newLessonRequestData); // No Authorization header

            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if studentId in body does not match authenticated user', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 8);
            futureDate.setHours(15, 0, 0, 0);

            const newLessonRequestData = {
                studentId: 'some-other-student-id-not-matching-token', // Mismatched ID
                addressObj: {
                    street: '1 Wrong Way',
                    city: 'Forbidden City',
                    state: 'FB',
                    postalCode: '00000',
                    country: 'Nowhere'
                },
                type: LessonType.VOICE,
                startTime: futureDate.toISOString(),
                durationMinutes: 60
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(newLessonRequestData);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Forbidden');
        });

        it('should return 400 Bad Request if required fields are missing (e.g., type)', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 9);

            const incompleteData = {
                studentId: seededStudentId,
                addressObj: { street: 'Incomplete St', city: 'Missing', state: 'MI', postalCode: '123', country: 'USA' },
                // type: LessonType.BASS, // Missing type
                startTime: futureDate.toISOString(),
                durationMinutes: 30
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined(); // Should contain validation error details
        });

        it('should return 400 Bad Request if addressObj is missing', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);

            const missingAddressData = {
                studentId: seededStudentId,
                // addressObj: { ... }, // Missing address
                type: LessonType.GUITAR,
                startTime: futureDate.toISOString(),
                durationMinutes: 60
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(missingAddressData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });


        it('should return 400 Bad Request if startTime is invalid', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const invalidStartTimeData = {
                studentId: seededStudentId,
                addressObj: { street: 'Bad Time Ave', city: 'Clocksville', state: 'BT', postalCode: '000', country: 'Time Warp' },
                type: LessonType.DRUMS,
                startTime: 'not-a-valid-date', // Invalid format
                durationMinutes: 45
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(invalidStartTimeData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });

        it('should return 400 Bad Request if durationMinutes is invalid (e.g., zero)', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 11);

            const invalidDurationData = {
                studentId: seededStudentId,
                addressObj: { street: 'Zero Duration Pl', city: 'Nowhere', state: 'ZD', postalCode: '000', country: 'None' },
                type: LessonType.VOICE,
                startTime: futureDate.toISOString(),
                durationMinutes: 0 // Invalid duration
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(invalidDurationData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });

        it('should return 400 Bad Request if addressObj has missing fields (e.g., street)', async () => {
            if (!seededStudentId || !seededStudentAuthToken) throw new Error('Seeded student auth info not available');

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 12);

            const incompleteAddressData = {
                studentId: seededStudentId,
                addressObj: {
                    // street: 'Missing Street', // Missing street
                    city: 'Incomplete City',
                    state: 'IS',
                    postalCode: '12345',
                    country: 'USA'
                },
                type: LessonType.BASS,
                startTime: futureDate.toISOString(),
                durationMinutes: 60
            };

            const response = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', seededStudentAuthToken)
                .send(incompleteAddressData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBeDefined();
        });
    });
}); 