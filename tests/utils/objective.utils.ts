import axios from 'axios';
import { AxiosResponse } from 'axios';
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
 * @returns Axios response promise.
 */
export const createObjective = (token: string, payload: CreateObjectivePayload): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/objectives`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Creates an objective without authentication.
 * @param payload Objective data.
 * @returns Axios response promise.
 */
export const createObjectiveUnauthenticated = (payload: CreateObjectivePayload): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/objectives`, payload);
};

// --- GET /objectives --- 

/**
 * Fetches objectives for the authenticated user.
 * @param token Raw JWT token.
 * @param studentId ID of the student whose objectives to fetch.
 * @returns Axios response promise.
 */
export const getObjectives = (token: string, studentId: string): Promise<AxiosResponse<Objective[]>> => {
    return axios.get(`${API_BASE_URL}/api/v1/objectives?studentId=${encodeURIComponent(studentId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches objectives without authentication.
 * @returns Axios response promise.
 */
export const getObjectivesUnauthenticated = (): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/objectives`);
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
 * @returns Axios response promise.
 */
export const updateObjectiveStatus = (token: string, objectiveId: string, payload: UpdateObjectiveStatusPayload): Promise<AxiosResponse<Objective>> => {
    return axios.patch(`${API_BASE_URL}/api/v1/objectives/${objectiveId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Updates the status of a specific objective without authentication.
 * @param objectiveId ID of the objective.
 * @param payload Payload containing the new status.
 * @returns Axios response promise.
 */
export const updateObjectiveStatusUnauthenticated = (objectiveId: string, payload: UpdateObjectiveStatusPayload): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/objectives/${objectiveId}`, payload);
};

/**
 * Sends a raw PATCH request to the objective endpoint (for testing invalid inputs).
 * @param token Raw JWT token.
 * @param objectiveId ID of the objective.
 * @param payload Raw payload object.
 * @returns Axios response promise.
 */
export const patchObjectiveRaw = (token: string, objectiveId: string, payload: any): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/objectives/${objectiveId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
}; 