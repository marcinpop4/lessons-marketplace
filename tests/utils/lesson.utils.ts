import axios from 'axios';
import { AxiosResponse } from 'axios';
import { Lesson } from '../../shared/models/Lesson';
import { LessonStatusTransition } from '../../shared/models/LessonStatus';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in lesson.utils.ts');
}

// --- GET /lessons --- 

/**
 * Fetches lessons based on query parameters.
 * @param token Raw JWT token.
 * @param queryParams Query parameters (e.g., { teacherId: '...' } or { quoteId: '...' }).
 * @returns Axios response promise.
 */
export const getLessons = (token: string, queryParams: Record<string, string>): Promise<AxiosResponse<Lesson[]>> => {
    return axios.get(`${API_BASE_URL}/api/v1/lessons`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: queryParams // Use params for query string
    });
};

/**
 * Fetches lessons based on query parameters without authentication.
 * @param queryParams Query parameters.
 * @returns Axios response promise.
 */
export const getLessonsUnauthenticated = (queryParams: Record<string, string>): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/lessons`, {
        params: queryParams // Use params for query string
    });
};

// --- POST /lessons --- 

interface CreateLessonPayload {
    quoteId: string;
}

/**
 * Creates a new lesson by accepting a quote.
 * @param token Raw JWT token.
 * @param payload Payload containing quoteId.
 * @returns Axios response promise.
 */
export const createLesson = (token: string, payload: CreateLessonPayload): Promise<AxiosResponse<Lesson>> => {
    return axios.post(`${API_BASE_URL}/api/v1/lessons`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Creates a new lesson without authentication.
 * @param payload Payload containing quoteId.
 * @returns Axios response promise.
 */
export const createLessonUnauthenticated = (payload: CreateLessonPayload): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/lessons`, payload);
};

// --- GET /lessons/:id --- 

/**
 * Fetches a specific lesson by its ID.
 * @param token Raw JWT token.
 * @param lessonId The ID of the lesson.
 * @returns Axios response promise.
 */
export const getLessonById = (token: string, lessonId: string): Promise<AxiosResponse<Lesson>> => {
    return axios.get(`${API_BASE_URL}/api/v1/lessons/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches a specific lesson by its ID without authentication.
 * @param lessonId The ID of the lesson.
 * @returns Axios response promise.
 */
export const getLessonByIdUnauthenticated = (lessonId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/lessons/${lessonId}`);
};

// --- PATCH /lessons/:lessonId --- 

interface UpdateLessonStatusPayload {
    transition: LessonStatusTransition;
    // Add other potential fields if needed
}

/**
 * Updates the status of a specific lesson.
 * @param token Raw JWT token.
 * @param lessonId The ID of the lesson.
 * @param payload Payload containing the status transition.
 * @returns Axios response promise.
 */
export const updateLessonStatus = (token: string, lessonId: string, payload: UpdateLessonStatusPayload): Promise<AxiosResponse<Lesson>> => {
    return axios.patch(`${API_BASE_URL}/api/v1/lessons/${lessonId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Updates the status of a specific lesson without authentication.
 * @param lessonId The ID of the lesson.
 * @param payload Payload containing the status transition.
 * @returns Axios response promise.
 */
export const updateLessonStatusUnauthenticated = (lessonId: string, payload: UpdateLessonStatusPayload): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/lessons/${lessonId}`, payload);
};

/**
 * Sends a raw PATCH request to the lesson endpoint (for testing invalid inputs).
 * @param token Raw JWT token.
 * @param lessonId The ID of the lesson.
 * @param payload The raw payload object to send.
 * @returns Axios response promise.
 */
export const patchLessonRaw = (token: string, lessonId: string, payload: any): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/lessons/${lessonId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}; 