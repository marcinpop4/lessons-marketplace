import request from 'supertest';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonType } from '@shared/models/LessonType'; // Use shared enum
import { Address } from '@shared/models/Address';

// Base URL
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('[Lesson Request Utils] Missing required environment variable: VITE_API_BASE_URL.');
}

// --- Higher-level Test Helper (Keep existing) ---

/**
 * Creates a test lesson request using the API and returns the parsed response body.
 * Assumes the request is successful (status 201).
 * 
 * @param studentToken Raw JWT token for the student.
 * @param studentId The ID of the student creating the request.
 * @param type The type of lesson requested.
 * @param startTime Optional start time (defaults to 1 day from now).
 * @param durationMinutes Optional duration (defaults to 60).
 * @param address Optional address object.
 * @returns The created LessonRequest object.
 */
export const createTestLessonRequest = async (
    studentToken: string,
    studentId: string,
    type: LessonType,
    startTime?: Date,
    durationMinutes: number = 60,
    address?: Partial<Address>
): Promise<LessonRequest> => {

    const defaultStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 1 day from now
    const defaultAddress = { street: '123 Util St', city: 'Utilville', state: 'UT', postalCode: '99999', country: 'Testland' };

    const requestData = {
        studentId: studentId,
        addressObj: address || defaultAddress,
        type: type,
        startTime: (startTime || defaultStartTime).toISOString(),
        durationMinutes: durationMinutes
    };

    const response = await request(API_BASE_URL!)
        .post('/api/v1/lesson-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(requestData);

    if (response.status !== 201 || !response.body.lessonRequest) {
        console.error('Create Test Lesson Request failed:', response.status, response.body);
        throw new Error(`Util failed to create lesson request. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    }

    return response.body.lessonRequest as LessonRequest;
};

// --- Lower-level API Call Utilities ---

// --- POST /lesson-requests ---

interface CreateLessonRequestPayload {
    studentId: string;
    addressObj: Partial<Address>;
    type: LessonType;
    startTime: string; // ISO String
    durationMinutes: number;
}

/**
 * Creates a lesson request via API.
 * @param token Raw JWT token (Student).
 * @param payload Request data.
 * @returns Supertest response promise.
 */
export const createLessonRequestRaw = (token: string, payload: CreateLessonRequestPayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lesson-requests')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Creates a lesson request without authentication.
 * @param payload Request data.
 * @returns Supertest response promise.
 */
export const createLessonRequestRawUnauthenticated = (payload: CreateLessonRequestPayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lesson-requests')
        .send(payload);
};

// --- GET /lesson-requests?studentId=... ---

/**
 * Fetches lesson requests by student ID.
 * @param token Raw JWT token.
 * @param studentId ID of the student.
 * @returns Supertest response promise.
 */
export const getLessonRequestsByStudentId = (token: string, studentId: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/lesson-requests')
        .set('Authorization', `Bearer ${token}`)
        .query({ studentId });
};

/**
 * Fetches lesson requests by student ID without authentication.
 * @param studentId ID of the student.
 * @returns Supertest response promise.
 */
export const getLessonRequestsByStudentIdUnauthenticated = (studentId: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/lesson-requests')
        .query({ studentId });
};

// --- GET /lesson-requests/:id ---

/**
 * Fetches a specific lesson request by ID.
 * @param token Raw JWT token.
 * @param requestId ID of the lesson request.
 * @returns Supertest response promise.
 */
export const getLessonRequestByIdRaw = (token: string, requestId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/lesson-requests/${requestId}`)
        .set('Authorization', `Bearer ${token}`);
};

/**
 * Fetches a specific lesson request by ID without authentication.
 * @param requestId ID of the lesson request.
 * @returns Supertest response promise.
 */
export const getLessonRequestByIdRawUnauthenticated = (requestId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/lesson-requests/${requestId}`);
}; 