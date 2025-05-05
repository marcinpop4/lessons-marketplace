import axios from 'axios';
import { AxiosResponse } from 'axios';
import { LessonType } from '@prisma/client';
import { TeacherLessonHourlyRateStatusTransition } from '@shared/models/TeacherLessonHourlyRateStatus.js';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required env var VITE_API_BASE_URL for rate utils');
}

/**
 * Utility function to create a teacher lesson hourly rate via API.
 * Assumes the provided authToken belongs to a TEACHER.
 * 
 * @param authToken Teacher's Bearer token (excluding 'Bearer ').
 * @param lessonType The type of lesson for the rate.
 * @param rateInCents The rate amount in cents.
 * @returns The created TeacherLessonHourlyRate shared model.
 * @throws Error if API call fails or returns unexpected status.
 */
export async function createTestTeacherRate(
    authToken: string,
    lessonType: LessonType,
    rateInCents: number
): Promise<TeacherLessonHourlyRate> {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/teacher-lesson-rates`,
            { lessonType, rateInCents },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        // Axios throws for non-2xx, so we check for expected success status (200 or 201)
        // If we reach here, status is 2xx. We primarily expect 201 (created) or potentially 200 (updated).
        if (response.status !== 201 && response.status !== 200) {
            console.warn(`Util createTestTeacherRate received unexpected success status: ${response.status} for rate ${lessonType}. Body:`, response.data);
            // Still treat as success if 2xx, but warn.
        }

        // Basic check for expected properties
        if (!response.data || !response.data.id || !response.data.currentStatus) {
            console.error('Util createTestTeacherRate received invalid response body:', response.data);
            throw new Error('Util createTestTeacherRate received invalid response body.');
        }

        return response.data as TeacherLessonHourlyRate;
    } catch (error: any) {
        console.error('Failed to create/update test rate via util:', error.response?.status, error.response?.data || error.message);
        const status = error.response?.status || 'N/A';
        const body = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        throw new Error(`Util failed to create/update rate ${lessonType}. Status: ${status}, Body: ${body}`);
    }
}

/**
 * Utility function to update the status of a teacher lesson hourly rate via API.
 * Assumes the provided authToken belongs to the TEACHER owning the rate.
 * 
 * @param authToken Teacher's Bearer token (excluding 'Bearer ').
 * @param rateId The ID of the rate to update.
 * @param transition The status transition to apply (ACTIVATE/DEACTIVATE).
 * @param context Optional context for the transition.
 * @returns The updated TeacherLessonHourlyRate shared model.
 * @throws Error if API call fails unexpectedly (excluding expected 409 conflicts).
 */
export async function updateTestRateStatus(
    authToken: string,
    rateId: string,
    transition: TeacherLessonHourlyRateStatusTransition,
    context?: any
): Promise<TeacherLessonHourlyRate> {
    try {
        const response = await axios.patch(`${API_BASE_URL}/api/v1/teacher-lesson-rates/${rateId}`,
            { transition, context },
            { headers: { 'Authorization': `Bearer ${authToken}` } }
        );

        // Axios throws for non-2xx, so if we reach here, it must be 200 OK.
        if (!response.data || !response.data.id || !response.data.currentStatus) {
            console.error('Util updateTestRateStatus received invalid response body on 200 OK:', response.data);
            throw new Error('Util updateTestRateStatus received invalid response body on 200 OK.');
        }
        return response.data as TeacherLessonHourlyRate;

    } catch (error: any) {
        // Check specifically for the expected 409 Conflict error
        if (axios.isAxiosError(error) && error.response?.status === 409) {
            console.warn(`Util updateTestRateStatus encountered expected 409 conflict for rate ${rateId}, transition ${transition}.`);
            // Return a minimal object as the update didn't actually happen (was already in target state)
            // Tests using this should be aware of this possibility.
            return { id: rateId } as TeacherLessonHourlyRate;
        } else {
            // Re-throw unexpected errors
            console.error(`Util updateTestRateStatus failed unexpectedly for rate ${rateId} with transition ${transition}. Status: ${error.response?.status}`, error.response?.data || error.message);
            const status = error.response?.status || 'N/A';
            const body = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            throw new Error(`Util failed to update rate status ${rateId}. Status: ${status}, Body: ${body}`);
        }
    }
} 