import request from 'supertest';
import { Lesson } from '@shared/models/Lesson';
import { LessonStatusTransition } from '@shared/models/LessonStatus';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in lesson.utils.ts');
}

// --- GET /lessons --- 

/**
 * Fetches lessons based on query parameters.
 * @param token Raw JWT token.
 * @param queryParams Query parameters (e.g., { teacherId: '...' } or { quoteId: '...' }).
 * @returns Supertest response promise.
 */
export const getLessons = (token: string, queryParams: Record<string, string>): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/lessons')
        .set('Authorization', `Bearer ${token}`)
        .query(queryParams);
};

/**
 * Fetches lessons based on query parameters without authentication.
 * @param queryParams Query parameters.
 * @returns Supertest response promise.
 */
export const getLessonsUnauthenticated = (queryParams: Record<string, string>): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/lessons')
        .query(queryParams);
};

// --- POST /lessons --- 

interface CreateLessonPayload {
    quoteId: string;
}

/**
 * Creates a new lesson by accepting a quote.
 * @param token Raw JWT token.
 * @param payload Payload containing quoteId.
 * @returns Supertest response promise.
 */
export const createLesson = (token: string, payload: CreateLessonPayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lessons')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Creates a new lesson without authentication.
 * @param payload Payload containing quoteId.
 * @returns Supertest response promise.
 */
export const createLessonUnauthenticated = (payload: CreateLessonPayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lessons')
        .send(payload);
};

// --- GET /lessons/:id --- 

/**
 * Fetches a specific lesson by its ID.
 * @param token Raw JWT token.
 * @param lessonId The ID of the lesson.
 * @returns Supertest response promise.
 */
export const getLessonById = (token: string, lessonId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${token}`);
};

/**
 * Fetches a specific lesson by its ID without authentication.
 * @param lessonId The ID of the lesson.
 * @returns Supertest response promise.
 */
export const getLessonByIdUnauthenticated = (lessonId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/lessons/${lessonId}`);
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
 * @returns Supertest response promise.
 */
export const updateLessonStatus = (token: string, lessonId: string, payload: UpdateLessonStatusPayload): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Updates the status of a specific lesson without authentication.
 * @param lessonId The ID of the lesson.
 * @param payload Payload containing the status transition.
 * @returns Supertest response promise.
 */
export const updateLessonStatusUnauthenticated = (lessonId: string, payload: UpdateLessonStatusPayload): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/lessons/${lessonId}`)
        .send(payload);
};

/**
 * Sends a raw PATCH request to the lesson endpoint (for testing invalid inputs).
 * @param token Raw JWT token.
 * @param lessonId The ID of the lesson.
 * @param payload The raw payload object to send.
 * @returns Supertest response promise.
 */
export const patchLessonRaw = (token: string, lessonId: string, payload: any): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/lessons/${lessonId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
}; 