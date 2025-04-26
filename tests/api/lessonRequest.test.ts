import request from 'supertest';
// Shared Models
import { LessonRequest } from '@shared/models/LessonRequest';
import { Student } from '@shared/models/Student';
import { Address } from '@shared/models/Address';
import { LessonType } from '@shared/models/LessonType'; // Use shared enum
import { UserType } from '@shared/models/UserType'; // Use shared enum
import { v4 as uuidv4 } from 'uuid';

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

        } catch (error) {
            console.error("Failed setup in main beforeAll:", error);
            throw error;
        }
    });

    // --- POST / --- //
    describe('POST /', () => {
        const validAddress = { street: '1 Post St', city: 'Postville', state: 'PS', postalCode: '111', country: 'Test' };
        const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
        let validRequestPayload: any;

        beforeEach(() => {
            // Reset payload before each test, using student1 ID
            validRequestPayload = {
                studentId: student1.id,
                addressObj: validAddress,
                type: LessonType.GUITAR,
                startTime: futureDate.toISOString(),
                durationMinutes: 60
            };
        });

        it('should create a new lesson request successfully (201)', async () => {
            // Use the raw utility function
            const response = await createLessonRequestRaw(student1Token, validRequestPayload);

            expect(response.status).toBe(201);
            expect(response.headers['content-type']).toMatch(/application\/json/);
            // Check the response body directly
            expect(response.body).toBeDefined();
            expect(response.body.id).toBeDefined();
            expect(response.body.student.id).toEqual(student1.id);
            expect(response.body.type).toEqual(validRequestPayload.type);
            expect(response.body.durationMinutes).toEqual(validRequestPayload.durationMinutes);
            expect(new Date(response.body.startTime)).toEqual(new Date(validRequestPayload.startTime));
            expect(response.body.address).toBeDefined();
            expect(response.body.address.street).toEqual(validRequestPayload.addressObj.street);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use raw unauthenticated util
            const response = await createLessonRequestRawUnauthenticated(validRequestPayload);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if studentId in body does not match authenticated user', async () => {
            const invalidPayload = {
                ...validRequestPayload,
                studentId: student2.id, // Trying to create for student 2
            };
            // Use raw util with student 1 token
            const response = await createLessonRequestRaw(student1Token, invalidPayload);
            expect(response.status).toBe(403);
        });

        it('should return 403 Forbidden if a Teacher tries to create a request', async () => {
            // Use raw util with teacher token
            const response = await createLessonRequestRaw(teacher1Token, validRequestPayload);
            expect(response.status).toBe(403); // Role check should fail
        });

        it('should return 400 Bad Request if required fields are missing', async () => {
            const incompleteData = {
                studentId: student1.id,
                // Missing addressObj, type, startTime, duration 
            };
            // Use raw util
            const response = await createLessonRequestRaw(student1Token, incompleteData as any);
            expect(response.status).toBe(400);
        });

    }); // End POST describe

    // --- GET /?studentId=... --- //
    describe('GET /?studentId=...', () => {
        let request1: LessonRequest;
        let request2: LessonRequest;

        // Setup uses higher-level helper - OK
        beforeAll(async () => {
            if (!student1Token) throw new Error("Student 1 token missing for GET / setup");
            request1 = await createTestLessonRequest(student1Token, student1.id, LessonType.GUITAR, new Date(Date.now() + 11 * 24 * 60 * 60 * 1000));
            request2 = await createTestLessonRequest(student1Token, student1.id, LessonType.DRUMS, new Date(Date.now() + 12 * 24 * 60 * 60 * 1000));
        });

        it('should return lesson requests for the authenticated student specified in query (200)', async () => {
            // Use util
            const response = await getLessonRequestsByStudentId(student1Token, student1.id);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            const requests: LessonRequest[] = response.body;
            expect(requests.length).toBeGreaterThanOrEqual(2);
            expect(requests.some(r => r.id === request1.id)).toBe(true);
            expect(requests.some(r => r.id === request2.id)).toBe(true);
            requests.forEach(r => expect(r.student.id).toEqual(student1.id));
        });

        it('should return 403 Forbidden if requesting requests for a different student', async () => {
            // Use util
            const response = await getLessonRequestsByStudentId(student1Token, student2.id);
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Forbidden');
        });

        it('should return an empty list for a student with no requests', async () => {
            // Use util
            const response = await getLessonRequestsByStudentId(student2Token, student2.id);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(0);
        });

        it('should return 403 Forbidden if a teacher tries to get requests via this route', async () => {
            // Use util
            const response = await getLessonRequestsByStudentId(teacher1Token, student1.id);
            expect(response.status).toBe(403); // Role check should fail
        });

        it('should return 400 Bad Request if studentId query parameter is missing', async () => {
            // Keep direct request: Testing specific lack of query param
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/lesson-requests`) // No query param
                .set('Authorization', `Bearer ${student1Token}`);
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Missing or invalid studentId query parameter');
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use unauthenticated util
            const response = await getLessonRequestsByStudentIdUnauthenticated(student1.id);
            expect(response.status).toBe(401);
        });

    }); // End GET / describe

    // --- GET /:id --- //
    describe('GET /:id', () => {
        let testRequest: LessonRequest;

        // Setup uses higher-level helper - OK
        beforeEach(async () => {
            if (!student1Token) throw new Error("Student 1 token missing for GET /:id beforeEach");
            testRequest = await createTestLessonRequest(student1Token, student1.id, LessonType.BASS);
        });

        it('should fetch a lesson request by its ID successfully (200)', async () => {
            // Use raw util
            const response = await getLessonRequestByIdRaw(student1Token, testRequest.id);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);
            const fetchedRequest: LessonRequest = response.body;
            expect(fetchedRequest).toBeDefined();
            expect(fetchedRequest.id).toEqual(testRequest.id);
            expect(fetchedRequest.student.id).toEqual(student1.id);
            expect(fetchedRequest.type).toEqual(LessonType.BASS);
        });

        it('should return 403 Forbidden if another student tries to fetch the request', async () => {
            // Use raw util
            const response = await getLessonRequestByIdRaw(student2Token, testRequest.id);
            expect(response.status).toBe(403);
        });

        it('should return 403 Forbidden if a teacher tries to fetch the request', async () => {
            // Use raw util
            const response = await getLessonRequestByIdRaw(teacher1Token, testRequest.id);
            expect(response.status).toBe(403);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use raw unauthenticated util
            const response = await getLessonRequestByIdRawUnauthenticated(testRequest.id);
            expect(response.status).toBe(401);
        });

        it('should return 404 Not Found for a non-existent request ID', async () => {
            const fakeId = uuidv4();
            // Use raw util
            const response = await getLessonRequestByIdRaw(student1Token, fakeId);
            expect(response.status).toBe(404);
        });

        it('should return 400 Bad Request for an invalid ID format', async () => {
            const invalidId = 'not-a-real-uuid';
            // Use raw util
            const response = await getLessonRequestByIdRaw(student1Token, invalidId);
            // Expect 400 because service validation catches invalid UUID
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Valid Lesson Request ID is required.');
        });

    }); // End GET /:id describe

}); // End main describe 