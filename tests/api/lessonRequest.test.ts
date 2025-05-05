import { LessonRequest } from '@shared/models/LessonRequest';
import { Student } from '@shared/models/Student';
import { Address } from '@shared/models/Address';
import { LessonType } from '@shared/models/LessonType'; // Use shared enum
import { UserType } from '@shared/models/UserType'; // Use shared enum
import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios'; // Import axios for direct calls and error checking

// Test Utilities
import { createTestStudent, createTestTeacher, loginTestUser } from './utils/user.utils';
// Import both the higher-level helper and lower-level utils
import {
    createTestLessonRequest,
    createLessonRequestRaw,
    createLessonRequestRawUnauthenticated,
    getLessonRequestsByStudentId,
    getLessonRequestsByStudentIdUnauthenticated,
    getLessonRequestByIdRaw,
    getLessonRequestByIdRawUnauthenticated
} from './utils/lessonRequest.utils';

// REMOVED: Seed data constants

// Base URL (needed for one direct request test)
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

// REMOVED: createTestLessonRequest helper moved to lessonRequest.utils.ts

// Main describe block
describe('API Integration: /api/v1/lesson-requests', () => {
    // User variables setup once
    let student1: Student;
    let student1Token: string;
    let student2: Student;
    let student2Token: string;
    let teacher1: any; // Type can be refined if Teacher model is imported
    let teacher1Token: string;

    // Static address data for tests
    const testAddressData: Partial<Address> = {
        street: '123 Test St',
        city: 'Testville',
        state: 'TS',
        postalCode: '12345',
        country: 'Testland'
    };

    // Default payload for creating requests
    let testRequestPayload: any;

    beforeAll(async () => {
        try {
            // Create Student 1
            const { user: s1, password: s1Password } = await createTestStudent();
            student1 = s1;
            student1Token = await loginTestUser(student1.email, s1Password, UserType.STUDENT);

            // Create Student 2
            const { user: s2, password: s2Password } = await createTestStudent();
            student2 = s2;
            student2Token = await loginTestUser(student2.email, s2Password, UserType.STUDENT);

            // Create Teacher 1
            const { user: t1, password: t1Password } = await createTestTeacher();
            teacher1 = t1;
            teacher1Token = await loginTestUser(teacher1.email, t1Password, UserType.TEACHER);

            // Initialize payload with student1's ID
            testRequestPayload = {
                studentId: student1.id,
                addressObj: testAddressData,
                type: LessonType.GUITAR,
                startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
                durationMinutes: 60
            };

        } catch (error) {
            console.error("Failed setup in main beforeAll:", error);
            throw error;
        }
    });

    // --- POST / --- //
    describe('POST /', () => {
        it('should create a new lesson request successfully (201)', async () => {
            const response = await createLessonRequestRaw(student1Token, testRequestPayload);

            expect(response.status).toBe(201);
            const createdRequest: LessonRequest = response.data; // Use response.data
            expect(createdRequest).toBeDefined();
            expect(createdRequest.id).toBeDefined();
            expect(createdRequest.student?.id).toEqual(student1.id);
            expect(createdRequest.type).toEqual(testRequestPayload.type);
            expect(createdRequest.address?.street).toEqual(testRequestPayload.addressObj.street);
            expect(createdRequest.startTime).toEqual(testRequestPayload.startTime);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use try-catch for expected errors with axios
            try {
                await createLessonRequestRawUnauthenticated(testRequestPayload);
                throw new Error('Request should have failed with 401'); // Fail test if no error thrown
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if studentId in body does not match authenticated user', async () => {
            const payloadWithWrongStudent = { ...testRequestPayload, studentId: student2.id };
            try {
                await createLessonRequestRaw(student1Token, payloadWithWrongStudent); // student1 token, student2 id
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden: You can only create lesson requests for yourself.');
            }
        });

        it('should return 403 Forbidden if a Teacher tries to create a request', async () => {
            // Modify payload to potentially use teacher ID if needed by endpoint,
            // but the core check is using the teacher token
            const payloadForTeacher = { ...testRequestPayload, studentId: 'some-student-id' }; // Use a placeholder or teacher ID if logic requires
            try {
                await createLessonRequestRaw(teacher1Token, payloadForTeacher);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden'); // Expect generic Forbidden from checkRole
            }
        });

        it('should return 400 Bad Request if required fields are missing', async () => {
            const incompletePayload = { ...testRequestPayload };
            delete incompletePayload.type; // Remove lesson type
            try {
                await createLessonRequestRaw(student1Token, incompletePayload as any);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                // Check for specific validation error message if available
                expect(error.response?.data?.error).toBeDefined();
                // Example check: expect(error.response?.data?.error).toContain('type is required');
            }
        });

    }); // End POST describe

    // --- GET /?studentId=... --- //
    describe('GET /?studentId=...', () => {
        let createdRequestId: string;

        // Create a request specifically for student1 before these tests run
        beforeAll(async () => {
            const response = await createLessonRequestRaw(student1Token, testRequestPayload);
            if (response.status !== 201 || !response.data?.id) {
                console.error("Failed setup for GET /?studentId tests:", response.status, response.data);
                throw new Error('Failed to create lesson request in beforeAll for GET tests');
            }
            createdRequestId = response.data.id;
        });

        it('should return lesson requests for the authenticated student specified in query (200)', async () => {
            const response = await getLessonRequestsByStudentId(student1Token, student1.id);
            expect(response.status).toBe(200);
            const requests: LessonRequest[] = response.data; // Use response.data
            expect(Array.isArray(requests)).toBe(true);
            // Ensure at least the created request is present
            const found = requests.find((req: LessonRequest) => req.id === createdRequestId);
            expect(found).toBeDefined();
            expect(found?.student?.id).toBe(student1.id);
        });

        it('should return 403 Forbidden if requesting requests for a different student', async () => {
            try {
                await getLessonRequestsByStudentId(student1Token, student2.id);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });

        it('should return an empty list for a student with no requests', async () => {
            // Assuming student2 has no requests made by them
            const response = await getLessonRequestsByStudentId(student2Token, student2.id);
            expect(response.status).toBe(200);
            expect(response.data).toEqual([]); // Use response.data
        });

        it('should return 403 Forbidden if a teacher tries to get requests via this route', async () => {
            try {
                await getLessonRequestsByStudentId(teacher1Token, student1.id);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });

        it('should return 400 Bad Request if studentId query parameter is missing', async () => {
            try {
                // Modify the call to simulate missing query param - depends on util structure
                // For axios, we can just make a raw call without the param
                await axios.get(`${API_BASE_URL}/api/v1/lesson-requests`, {
                    headers: { 'Authorization': `Bearer ${student1Token}` }
                });
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                // Check specific error if needed
                expect(error.response?.data?.error).toContain('Missing or invalid studentId query parameter');
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await getLessonRequestsByStudentIdUnauthenticated(student1.id);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

    }); // End GET / describe

    // --- GET /:id --- //
    describe('GET /:id', () => {
        let createdRequestId: string;

        beforeAll(async () => {
            const response = await createLessonRequestRaw(student1Token, testRequestPayload);
            if (response.status !== 201 || !response.data?.id) {
                console.error("Failed setup for GET /:id tests:", response.status, response.data);
                throw new Error('Failed to create lesson request in beforeAll for GET /:id tests');
            }
            createdRequestId = response.data.id;
        });

        it('should fetch a lesson request by its ID successfully (200)', async () => {
            const response = await getLessonRequestByIdRaw(student1Token, createdRequestId);
            expect(response.status).toBe(200);
            const fetchedRequest: LessonRequest = response.data; // Use response.data
            expect(fetchedRequest).toBeDefined();
            expect(fetchedRequest.id).toEqual(createdRequestId);
            expect(fetchedRequest.student?.id).toEqual(student1.id);
        });

        it('should return 403 Forbidden if another student tries to fetch the request', async () => {
            try {
                await getLessonRequestByIdRaw(student2Token, createdRequestId);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });

        it('should return 403 Forbidden if a teacher tries to fetch the request', async () => {
            try {
                await getLessonRequestByIdRaw(teacher1Token, createdRequestId);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await getLessonRequestByIdRawUnauthenticated(createdRequestId);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 404 Not Found for a non-existent request ID', async () => {
            const fakeId = uuidv4();
            try {
                await getLessonRequestByIdRaw(student1Token, fakeId);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });

        it('should return 400 Bad Request for an invalid ID format', async () => {
            const invalidId = 'not-a-real-uuid';
            try {
                await getLessonRequestByIdRaw(student1Token, invalidId);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                // Expect 400 because service validation catches invalid UUID
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.error).toContain('Valid Lesson Request ID is required.'); // Check specific error
            }
        });

    }); // End GET /:id describe

}); // End main describe 