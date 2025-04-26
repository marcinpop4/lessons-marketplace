import request from 'supertest';
import { Goal } from '@shared/models/Goal';
import { GoalStatusTransition } from '@shared/models/GoalStatus';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in goal.utils.ts');
}

// Type definition for goal creation payload
interface CreateGoalPayload {
    lessonId: string;
    title: string;
    description: string;
    estimatedLessonCount: number;
}

/**
 * Creates a new goal via the API.
 * @param token - The authentication token (raw JWT).
 * @param goalData - The data for the goal to create.
 * @returns The supertest response promise.
 */
export const createGoal = (token: string, goalData: CreateGoalPayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .send(goalData);
};

/**
 * Creates a new goal via the API without authentication.
 * @param goalData - The data for the goal to create.
 * @returns The supertest response promise.
 */
export const createGoalUnauthenticated = (goalData: CreateGoalPayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/goals')
        .send(goalData);
};

/**
 * Fetches goals for a specific lesson via the API.
 * @param token - The authentication token (raw JWT).
 * @param lessonId - The ID of the lesson whose goals are to be fetched.
 * @returns The supertest response promise.
 */
export const getGoalsByLessonId = (token: string, lessonId: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`)
        .query({ lessonId });
};

/**
 * Fetches goals for a specific lesson via the API without authentication.
 * @param lessonId - The ID of the lesson whose goals are to be fetched.
 * @returns The supertest response promise.
 */
export const getGoalsByLessonIdUnauthenticated = (lessonId: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/goals')
        .query({ lessonId });
};

/**
 * Fetches a specific goal by its ID via the API.
 * @param token - The authentication token (raw JWT).
 * @param goalId - The ID of the goal to fetch.
 * @returns The supertest response promise.
 */
export const getGoalById = (token: string, goalId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`);
};

/**
 * Fetches a specific goal by its ID via the API without authentication.
 * @param goalId - The ID of the goal to fetch.
 * @returns The supertest response promise.
 */
export const getGoalByIdUnauthenticated = (goalId: string): request.Test => {
    return request(API_BASE_URL!)
        .get(`/api/v1/goals/${goalId}`);
};

/**
 * Updates the status of a specific goal via the API.
 * @param token - The authentication token (raw JWT).
 * @param goalId - The ID of the goal to update.
 * @param transition - The status transition action.
 * @returns The supertest response promise.
 */
export const updateGoalStatus = (token: string, goalId: string, transition: GoalStatusTransition): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ transition });
};

/**
 * Updates the status of a specific goal via the API without authentication.
 * @param goalId - The ID of the goal to update.
 * @param transition - The status transition action.
 * @returns The supertest response promise.
 */
export const updateGoalStatusUnauthenticated = (goalId: string, transition: GoalStatusTransition): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/goals/${goalId}`)
        .send({ transition });
};

/**
 * Sends a raw PATCH request to the goal endpoint (for testing invalid inputs).
 * @param token - The authentication token (raw JWT).
 * @param goalId - The ID of the goal to update.
 * @param payload - The raw payload object to send.
 * @returns The supertest response promise.
 */
export const patchGoalRaw = (token: string, goalId: string, payload: any): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/goals/${goalId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Sends an unauthenticated raw PATCH request to the goal endpoint.
 * @param goalId - The ID of the goal to update.
 * @param payload - The raw payload object to send.
 * @returns The supertest response promise.
 */
export const patchGoalRawUnauthenticated = (goalId: string, payload: any): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/goals/${goalId}`)
        .send(payload);
}; 