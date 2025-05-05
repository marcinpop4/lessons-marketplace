import axios from 'axios';
import { AxiosResponse } from 'axios';
import { LessonRequest } from '../../shared/models/LessonRequest';
import { LessonType } from '../../shared/models/LessonType'; // Use shared enum
import { Address } from '../../shared/models/Address';

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
 * @param studentToken Raw JWT token for the student (excluding 'Bearer ').
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

    try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/lesson-requests`, requestData, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });

        // Axios throws on non-2xx, check for 201 specifically if needed, otherwise check body
        if (response.status !== 201 || !response.data || !response.data.id) { // Check for body and an ID property
            console.error('Create Test Lesson Request failed:', response.status, response.data);
            throw new Error(`Util failed to create lesson request. Status: ${response.status}, Body: ${JSON.stringify(response.data)}`);
        }

        return response.data as LessonRequest;
    } catch (error: any) {
        console.error('Error creating Test Lesson Request:', error.response?.status, error.response?.data || error.message);
        const status = error.response?.status || 'N/A';
        const body = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Util failed to create lesson request. Status: ${status}, Body: ${body}`);
    }
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
 * @returns Axios response promise.
 */
export const createLessonRequestRaw = (token: string, payload: CreateLessonRequestPayload): Promise<AxiosResponse<LessonRequest>> => {
    return axios.post(`${API_BASE_URL}/api/v1/lesson-requests`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Creates a lesson request without authentication.
 * @param payload Request data.
 * @returns Axios response promise.
 */
export const createLessonRequestRawUnauthenticated = (payload: CreateLessonRequestPayload): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/lesson-requests`, payload);
};

// --- GET /lesson-requests?studentId=... ---

/**
 * Fetches lesson requests by student ID.
 * @param token Raw JWT token.
 * @param studentId ID of the student.
 * @returns Axios response promise.
 */
export const getLessonRequestsByStudentId = (token: string, studentId: string): Promise<AxiosResponse<LessonRequest[]>> => {
    return axios.get(`${API_BASE_URL}/api/v1/lesson-requests`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { studentId } // Use params for query string
    });
};

/**
 * Fetches lesson requests by student ID without authentication.
 * @param studentId ID of the student.
 * @returns Axios response promise.
 */
export const getLessonRequestsByStudentIdUnauthenticated = (studentId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/lesson-requests`, {
        params: { studentId } // Use params for query string
    });
};

// --- GET /lesson-requests/:id ---

/**
 * Fetches a specific lesson request by ID.
 * @param token Raw JWT token.
 * @param requestId ID of the lesson request.
 * @returns Axios response promise.
 */
export const getLessonRequestByIdRaw = (token: string, requestId: string): Promise<AxiosResponse<LessonRequest>> => {
    return axios.get(`${API_BASE_URL}/api/v1/lesson-requests/${requestId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches a specific lesson request by ID without authentication.
 * @param requestId ID of the lesson request.
 * @returns Axios response promise.
 */
export const getLessonRequestByIdRawUnauthenticated = (requestId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/lesson-requests/${requestId}`);
}; 