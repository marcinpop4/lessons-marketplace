import axios from 'axios';
import { AxiosResponse } from 'axios';
import { LessonQuote } from '../../shared/models/LessonQuote';
import { Lesson } from '../../shared/models/Lesson';
import { LessonQuoteStatusValue } from '../../shared/models/LessonQuoteStatus';
import { LessonType } from '../../shared/models/LessonType';

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
 * @param studentToken - The Bearer token for the student (excluding 'Bearer ').
 * @param quoteData - Data for generating quotes { lessonRequestId, teacherIds? }.
 * @returns An array of the created LessonQuote objects.
 */
export const createTestLessonQuote = async (studentToken: string, quoteData: CreateQuoteData): Promise<LessonQuote[]> => {
    // Construct payload, including teacherIds only if present and not empty
    const payload: { lessonRequestId: string; teacherIds?: string[] } = {
        lessonRequestId: quoteData.lessonRequestId
    };
    if (quoteData.teacherIds && quoteData.teacherIds.length > 0) {
        payload.teacherIds = quoteData.teacherIds;
    }

    try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/lesson-quotes`, payload, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });

        if (response.status !== 201 || !Array.isArray(response.data)) {
            console.error('Failed to create/generate test lesson quotes via util or response not array:', response.status, response.data);
            throw new Error(`Util failed to create/generate lesson quotes. Status: ${response.status}, Body: ${JSON.stringify(response.data)}`);
        }

        return response.data as LessonQuote[];
    } catch (error: any) {
        console.error('Error creating/generating test lesson quotes via util:', error.response?.status, error.response?.data || error.message);
        const status = error.response?.status || 'N/A';
        const body = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Util failed to create/generate lesson quotes. Status: ${status}, Body: ${body}`);
    }
};

/**
 * Accepts a test lesson quote using the API, which should create a Lesson.
 * Requires the student's authentication token.
 *
 * @param studentToken - The Bearer token for the student (excluding 'Bearer ').
 * @param quoteId - The ID of the lesson quote to accept.
 * @returns The ID of the LessonRequest associated with the accepted quote.
 */
export const acceptTestLessonQuote = async (studentToken: string, quoteId: string): Promise<string> => {
    try {
        const response = await axios.patch(`${API_BASE_URL}/api/v1/lesson-quotes/${quoteId}`,
            { status: LessonQuoteStatusValue.ACCEPTED },
            { headers: { 'Authorization': `Bearer ${studentToken}` } }
        );

        // Axios throws on non-2xx, so we only need to validate the 200 response body
        const updatedQuote = response.data;
        if (!updatedQuote || !updatedQuote.id ||
            !updatedQuote.currentStatus || updatedQuote.currentStatus.status !== LessonQuoteStatusValue.ACCEPTED ||
            !updatedQuote.lessonRequest || !updatedQuote.lessonRequest.id) {
            console.error('Updated LessonQuote object missing or invalid from successful PATCH /lesson-quotes response:', response.data);
            throw new Error('Updated LessonQuote object missing or invalid from response body after accepting quote.');
        }

        return updatedQuote.lessonRequest.id;
    } catch (error: any) {
        console.error('Failed to accept test lesson quote via util:', error.response?.status, error.response?.data || error.message);
        const status = error.response?.status || 'N/A';
        const body = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Util failed to accept lesson quote ${quoteId}. Status: ${status}, Body: ${body}`);
    }
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
 * @returns Axios response promise.
 */
export const createQuote = (token: string, payload: CreateQuotePayload): Promise<AxiosResponse<LessonQuote[]>> => {
    return axios.post(`${API_BASE_URL}/api/v1/lesson-quotes`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Creates (generates) new lesson quotes without authentication.
 * @param payload Quote generation data.
 * @returns Axios response promise.
 */
export const createQuoteUnauthenticated = (payload: CreateQuotePayload): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/lesson-quotes`, payload);
};

// --- GET /lesson-quotes?lessonRequestId=... --- 

/**
 * Fetches lesson quotes by lesson request ID.
 * @param token Raw JWT token.
 * @param lessonRequestId ID of the lesson request.
 * @returns Axios response promise.
 */
export const getQuotesByLessonRequestId = (token: string, lessonRequestId: string): Promise<AxiosResponse<LessonQuote[]>> => {
    return axios.get(`${API_BASE_URL}/api/v1/lesson-quotes`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { lessonRequestId } // Use params for query string
    });
};

/**
 * Fetches lesson quotes by lesson request ID without authentication.
 * @param lessonRequestId ID of the lesson request.
 * @returns Axios response promise.
 */
export const getQuotesByLessonRequestIdUnauthenticated = (lessonRequestId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/lesson-quotes`, {
        params: { lessonRequestId } // Use params for query string
    });
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
 * @returns Axios response promise.
 */
export const updateQuoteStatus = (token: string, quoteId: string, payload: UpdateQuoteStatusPayload): Promise<AxiosResponse<LessonQuote>> => {
    return axios.patch(`${API_BASE_URL}/api/v1/lesson-quotes/${quoteId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Updates the status of a lesson quote without authentication.
 * @param quoteId ID of the quote.
 * @param payload Payload containing the new status.
 * @returns Axios response promise.
 */
export const updateQuoteStatusUnauthenticated = (quoteId: string, payload: UpdateQuoteStatusPayload): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/lesson-quotes/${quoteId}`, payload);
};

/**
 * Sends a raw PATCH request to the lesson quote endpoint (for testing invalid inputs).
 * @param token Raw JWT token.
 * @param quoteId ID of the quote.
 * @param payload Raw payload object.
 * @returns Axios response promise.
 */
export const patchQuoteRaw = (token: string, quoteId: string, payload: any): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/lesson-quotes/${quoteId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}; 