import request from 'supertest';
import { LessonQuote } from '@shared/models/LessonQuote';
import { Lesson } from '@shared/models/Lesson';
import { LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';
import { LessonType } from '@shared/models/LessonType';

// Base URL
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('[Lesson Quote Utils] Missing required environment variable: VITE_API_BASE_URL.');
}

// Updated interface for creating quotes (via generate endpoint)
// Now accepts optional teacherIds instead of lessonType
interface CreateQuoteData {
    lessonRequestId: string;
    teacherIds?: string[]; // Optional array of teacher UUIDs
}

/**
 * Creates (generates) test lesson quotes using the API.
 * Requires the student's authentication token.
 * If teacherIds are provided, quotes are generated ONLY for those teachers.
 * If teacherIds is omitted, the API finds available teachers and generates quotes.
 *
 * @param studentToken - The Bearer token for the student.
 * @param quoteData - Data for generating quotes { lessonRequestId, teacherIds? }.
 * @returns An array of the created LessonQuote objects.
 */
export const createTestLessonQuote = async (studentToken: string, quoteData: CreateQuoteData): Promise<LessonQuote[]> => {
    if (!studentToken.startsWith('Bearer ')) {
        studentToken = `Bearer ${studentToken}`;
    }

    // Construct payload, including teacherIds only if present and not empty
    const payload: { lessonRequestId: string; teacherIds?: string[] } = {
        lessonRequestId: quoteData.lessonRequestId
    };
    if (quoteData.teacherIds && quoteData.teacherIds.length > 0) {
        payload.teacherIds = quoteData.teacherIds;
    }

    const response = await request(API_BASE_URL!)
        .post('/api/v1/lesson-quotes')
        .set('Authorization', studentToken)
        .send(payload); // Send the potentially modified payload

    if (response.status !== 201) {
        console.error('Failed to create/generate test lesson quotes via util:', response.status, response.body);
        throw new Error(`Util failed to create/generate lesson quotes. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    }

    if (!Array.isArray(response.body)) {
        console.error('Expected an array from successful POST /lesson-quotes response:', response.body);
        throw new Error('Expected an array from response body after quote generation.');
    }

    return response.body as LessonQuote[];
};

/**
 * Accepts a test lesson quote using the API, which should create a Lesson.
 * Requires the student's authentication token.
 *
 * @param studentToken - The Bearer token for the student.
 * @param quoteId - The ID of the lesson quote to accept.
 * @returns The ID of the LessonRequest associated with the accepted quote.
 */
export const acceptTestLessonQuote = async (studentToken: string, quoteId: string): Promise<string> => {
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

    const updatedQuote = response.body;
    if (!updatedQuote || !updatedQuote.id ||
        !updatedQuote.currentStatus || updatedQuote.currentStatus.status !== LessonQuoteStatusValue.ACCEPTED ||
        !updatedQuote.lessonRequest || !updatedQuote.lessonRequest.id) {
        console.error('Updated LessonQuote object missing or invalid from successful PATCH /lesson-quotes response:', response.body);
        throw new Error('Updated LessonQuote object missing or invalid from response body after accepting quote.');
    }

    return updatedQuote.lessonRequest.id;
};

// --- Lower-level API Call Utilities ---

// --- POST /lesson-quotes ---

// Updated payload for generating quotes
// Mirroring the structure used in createTestLessonQuote utility
interface CreateQuotePayload {
    lessonRequestId: string;
    teacherIds?: string[]; // Optional array of teacher UUIDs
    // lessonType: LessonType; // Removed lessonType
}

/**
 * Creates (generates) new lesson quotes via API.
 * @param token Raw JWT token (Student).
 * @param payload Quote generation data.
 * @returns Supertest response promise.
 */
export const createQuote = (token: string, payload: CreateQuotePayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/lesson-quotes')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Creates (generates) new lesson quotes without authentication.
 * @param payload Quote generation data.
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
    status: LessonQuoteStatusValue;
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