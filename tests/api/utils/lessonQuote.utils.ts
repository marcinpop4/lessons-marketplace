import request from 'supertest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Lesson } from '@shared/models/Lesson';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';

// Base URL
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('[Lesson Quote Utils] Missing required environment variable: VITE_API_BASE_URL.');
}

interface CreateQuoteData {
    lessonRequestId: string;
    costInCents: number;
    hourlyRateInCents: number;
}

/**
 * Creates a test lesson quote using the API.
 * Requires the teacher's authentication token.
 * 
 * @param teacherToken - The Bearer token for the teacher.
 * @param quoteData - Data for the quote (lessonRequestId, costInCents, hourlyRateInCents).
 * @returns The created LessonQuote object.
 */
export const createTestLessonQuote = async (teacherToken: string, quoteData: CreateQuoteData): Promise<LessonQuote> => {
    if (!teacherToken.startsWith('Bearer ')) {
        teacherToken = `Bearer ${teacherToken}`;
    }

    const response = await request(API_BASE_URL!)
        .post('/api/v1/lesson-quotes')
        .set('Authorization', teacherToken)
        .send(quoteData);

    if (response.status !== 201) {
        console.error('Failed to create test lesson quote via util:', response.status, response.body);
        throw new Error(`Util failed to create lesson quote. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    }

    // Assuming the response body is the created LessonQuote object
    if (!response.body || !response.body.id) {
        console.error('Lesson quote object missing or invalid from successful POST /lesson-quotes response:', response.body);
        throw new Error('Lesson quote object missing or invalid from response body after creation.');
    }

    // We might need to instantiate the class here if the API returns plain JSON
    // For now, let's assume the structure matches and cast
    return response.body as LessonQuote;
};

/**
 * Accepts a test lesson quote using the API, which should create a Lesson.
 * Requires the student's authentication token.
 * 
 * @param studentToken - The Bearer token for the student.
 * @param quoteId - The ID of the lesson quote to accept.
 * @returns The created Lesson object.
 */
export const acceptTestLessonQuote = async (studentToken: string, quoteId: string): Promise<Lesson> => {
    if (!studentToken.startsWith('Bearer ')) {
        studentToken = `Bearer ${studentToken}`;
    }

    const response = await request(API_BASE_URL!)
        .patch(`/api/v1/lesson-quotes/${quoteId}`)
        .set('Authorization', studentToken)
        .send({ status: LessonQuoteStatusValue.ACCEPTED });

    if (response.status !== 200) {
        console.error('Failed to accept test lesson quote via util:', response.status, response.body);
        throw new Error(`Util failed to accept lesson quote ${quoteId}. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    }

    // Assuming the response body is the created Lesson object
    if (!response.body || !response.body.id || !response.body.quote) {
        console.error('Lesson object missing or invalid from successful PATCH /lesson-quotes response:', response.body);
        throw new Error('Lesson object missing or invalid from response body after accepting quote.');
    }

    return response.body as Lesson;
};

// --- Lower-level API Call Utilities ---

// --- POST /lesson-quotes --- 

interface CreateQuotePayload {
    lessonRequestId: string;
    costInCents: number;
    hourlyRateInCents: number;
}

/**
 * Creates a new lesson quote via API.
 * @param token Raw JWT token (Teacher).
 * @param payload Quote data.
 * @returns Supertest response promise.
 */
export const createQuote = (token: string, payload: CreateQuotePayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lesson-quotes')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Creates a new lesson quote without authentication.
 * @param payload Quote data.
 * @returns Supertest response promise.
 */
export const createQuoteUnauthenticated = (payload: CreateQuotePayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lesson-quotes')
        .send(payload);
};

// --- GET /lesson-quotes?lessonRequestId=... --- 

/**
 * Fetches lesson quotes by lesson request ID.
 * @param token Raw JWT token.
 * @param lessonRequestId ID of the lesson request.
 * @returns Supertest response promise.
 */
export const getQuotesByLessonRequestId = (token: string, lessonRequestId: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/lesson-quotes')
        .set('Authorization', `Bearer ${token}`)
        .query({ lessonRequestId });
};

/**
 * Fetches lesson quotes by lesson request ID without authentication.
 * @param lessonRequestId ID of the lesson request.
 * @returns Supertest response promise.
 */
export const getQuotesByLessonRequestIdUnauthenticated = (lessonRequestId: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/lesson-quotes')
        .query({ lessonRequestId });
};

// --- PATCH /lesson-quotes/:quoteId --- 

interface UpdateQuoteStatusPayload {
    status: LessonQuoteStatusValue; // Only status update is supported via PATCH
}

/**
 * Updates the status of a lesson quote.
 * @param token Raw JWT token.
 * @param quoteId ID of the quote.
 * @param payload Payload containing the new status.
 * @returns Supertest response promise.
 */
export const updateQuoteStatus = (token: string, quoteId: string, payload: UpdateQuoteStatusPayload): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/lesson-quotes/${quoteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Updates the status of a lesson quote without authentication.
 * @param quoteId ID of the quote.
 * @param payload Payload containing the new status.
 * @returns Supertest response promise.
 */
export const updateQuoteStatusUnauthenticated = (quoteId: string, payload: UpdateQuoteStatusPayload): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/lesson-quotes/${quoteId}`)
        .send(payload);
};

/**
 * Sends a raw PATCH request to the lesson quote endpoint (for testing invalid inputs).
 * @param token Raw JWT token.
 * @param quoteId ID of the quote.
 * @param payload Raw payload object.
 * @returns Supertest response promise.
 */
export const patchQuoteRaw = (token: string, quoteId: string, payload: any): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/lesson-quotes/${quoteId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
}; 