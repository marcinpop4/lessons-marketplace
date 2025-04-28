import request from 'supertest';
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
 * @param authToken Teacher's Bearer token.
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
    const response = await request(API_BASE_URL!)
        .post('/api/v1/teacher-lesson-rates')
        .set('Authorization', authToken)
        .send({ lessonType, rateInCents });

    if (response.status !== 201 && response.status !== 200) { // Allow 200 for updates
        console.error('Failed to create/update test rate via util:', response.status, response.body);
        throw new Error(`Util failed to create/update rate ${lessonType}. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    }

    // Basic check for expected properties (can be expanded)
    if (!response.body || !response.body.id || !response.body.currentStatus) {
        throw new Error('Util createTestTeacherRate received invalid response body.');
    }

    // Return the body which should match the shared model structure
    // No explicit mapping needed here if API returns the shared model directly
    return response.body as TeacherLessonHourlyRate;
}

/**
 * Utility function to update the status of a teacher lesson hourly rate via API.
 * Assumes the provided authToken belongs to the TEACHER owning the rate.
 * 
 * @param authToken Teacher's Bearer token.
 * @param rateId The ID of the rate to update.
 * @param transition The status transition to apply (ACTIVATE/DEACTIVATE).
 * @param context Optional context for the transition.
 * @returns The updated TeacherLessonHourlyRate shared model.
 * @throws Error if API call fails or returns unexpected status (excluding idempotent 409 conflicts).
 */
export async function updateTestRateStatus(
    authToken: string,
    rateId: string,
    transition: TeacherLessonHourlyRateStatusTransition,
    context?: any
): Promise<TeacherLessonHourlyRate> {
    const response = await request(API_BASE_URL!)
        .patch(`/api/v1/teacher-lesson-rates/${rateId}`)
        .set('Authorization', authToken)
        .send({ transition, context });

    // Allow 200 OK or 409 Conflict (for idempotent calls), but throw for other errors.
    if (response.status !== 200 && response.status !== 409) {
        console.error(`Util updateTestRateStatus failed unexpectedly for rate ${rateId} with transition ${transition}. Status: ${response.status}`, response.body);
        throw new Error(`Util failed to update rate status ${rateId}. Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
    }

    // If it was 409, the body might be an error object, not the rate object.
    // Only validate/return the body if the status was 200.
    if (response.status === 200) {
        // Basic check for expected properties on successful update
        if (!response.body || !response.body.id || !response.body.currentStatus) {
            throw new Error('Util updateTestRateStatus received invalid response body on 200 OK.');
        }
        return response.body as TeacherLessonHourlyRate;
    } else {
        // For 409, we don't have the updated rate object in the response body.
        // Return a placeholder or fetch the rate again if needed, 
        // but for setup purposes, returning a simplified object might be sufficient.
        // Alternatively, could modify the test not to rely on the return value in this case.
        // For now, let's return just the ID and a signal it was a conflict.
        // NOTE: This return type might need adjustment based on how tests use it.
        console.warn(`Util updateTestRateStatus encountered expected 409 conflict for rate ${rateId}, transition ${transition}.`);
        // Returning a minimal object; tests relying on the full object after a 409 might need adjustment.
        return { id: rateId } as TeacherLessonHourlyRate;
    }
} 