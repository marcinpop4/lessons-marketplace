import request from 'supertest';
import { Objective } from '@shared/models/Objective';
import { LessonType } from '@shared/models/LessonType';
import { ObjectiveStatusValue } from '@shared/models/ObjectiveStatus';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in objective.utils.ts');
}

// --- POST /objectives --- 

export interface CreateObjectivePayload {
    title: string;
    description?: string;
    lessonType: LessonType;
    targetDate: string; // ISO String
}

/**
 * Creates an objective via API.
 * @param token Raw JWT token (Student).
 * @param payload Objective data.
 * @returns Supertest response promise.
 */
export const createObjective = (token: string, payload: CreateObjectivePayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/objectives')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Creates an objective without authentication.
 * @param payload Objective data.
 * @returns Supertest response promise.
 */
export const createObjectiveUnauthenticated = (payload: CreateObjectivePayload): request.Test => {
    return request(API_BASE_URL!)
        .post('/api/v1/objectives')
        .send(payload);
};

// --- GET /objectives --- 

/**
 * Fetches objectives for the authenticated user.
 * @param token Raw JWT token.
 * @returns Supertest response promise.
 */
export const getObjectives = (token: string): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/objectives')
        .set('Authorization', `Bearer ${token}`);
};

/**
 * Fetches objectives without authentication.
 * @returns Supertest response promise.
 */
export const getObjectivesUnauthenticated = (): request.Test => {
    return request(API_BASE_URL!)
        .get('/api/v1/objectives');
};

// --- PATCH /objectives/:objectiveId --- 

export interface UpdateObjectiveStatusPayload {
    status: ObjectiveStatusValue;
}

/**
 * Updates the status of a specific objective.
 * @param token Raw JWT token.
 * @param objectiveId ID of the objective.
 * @param payload Payload containing the new status.
 * @returns Supertest response promise.
 */
export const updateObjectiveStatus = (token: string, objectiveId: string, payload: UpdateObjectiveStatusPayload): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/objectives/${objectiveId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
};

/**
 * Updates the status of a specific objective without authentication.
 * @param objectiveId ID of the objective.
 * @param payload Payload containing the new status.
 * @returns Supertest response promise.
 */
export const updateObjectiveStatusUnauthenticated = (objectiveId: string, payload: UpdateObjectiveStatusPayload): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/objectives/${objectiveId}`)
        .send(payload);
};

/**
 * Sends a raw PATCH request to the objective endpoint (for testing invalid inputs).
 * @param token Raw JWT token.
 * @param objectiveId ID of the objective.
 * @param payload Raw payload object.
 * @returns Supertest response promise.
 */
export const patchObjectiveRaw = (token: string, objectiveId: string, payload: any): request.Test => {
    return request(API_BASE_URL!)
        .patch(`/api/v1/objectives/${objectiveId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
}; 