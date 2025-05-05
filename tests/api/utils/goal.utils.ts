import axios from 'axios';
import { AxiosResponse } from 'axios';
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
 * @returns Axios response promise.
 */
export const createGoal = (token: string, goalData: CreateGoalPayload): Promise<AxiosResponse<Goal>> => {
    return axios.post(`${API_BASE_URL}/api/v1/goals`, goalData, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Creates a new goal via the API without authentication.
 * @param goalData - The data for the goal to create.
 * @returns Axios response promise.
 */
export const createGoalUnauthenticated = (goalData: CreateGoalPayload): Promise<AxiosResponse> => {
    return axios.post(`${API_BASE_URL}/api/v1/goals`, goalData);
};

/**
 * Fetches goals for a specific lesson via the API.
 * @param token - The authentication token (raw JWT).
 * @param lessonId - The ID of the lesson whose goals are to be fetched.
 * @returns Axios response promise.
 */
export const getGoalsByLessonId = (token: string, lessonId: string): Promise<AxiosResponse<Goal[]>> => {
    return axios.get(`${API_BASE_URL}/api/v1/goals`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { lessonId }
    });
};

/**
 * Fetches goals for a specific lesson via the API without authentication.
 * @param lessonId - The ID of the lesson whose goals are to be fetched.
 * @returns Axios response promise.
 */
export const getGoalsByLessonIdUnauthenticated = (lessonId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/goals`, {
        params: { lessonId }
    });
};

/**
 * Fetches a specific goal by its ID via the API.
 * @param token - The authentication token (raw JWT).
 * @param goalId - The ID of the goal to fetch.
 * @returns Axios response promise.
 */
export const getGoalById = (token: string, goalId: string): Promise<AxiosResponse<Goal>> => {
    return axios.get(`${API_BASE_URL}/api/v1/goals/${goalId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches a specific goal by its ID via the API without authentication.
 * @param goalId - The ID of the goal to fetch.
 * @returns Axios response promise.
 */
export const getGoalByIdUnauthenticated = (goalId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/goals/${goalId}`);
};

/**
 * Updates the status of a specific goal via the API.
 * @param token - The authentication token (raw JWT).
 * @param goalId - The ID of the goal to update.
 * @param transition - The status transition action.
 * @returns Axios response promise.
 */
export const updateGoalStatus = (token: string, goalId: string, transition: GoalStatusTransition): Promise<AxiosResponse<Goal>> => {
    return axios.patch(`${API_BASE_URL}/api/v1/goals/${goalId}`,
        { transition }, // Send transition in the body
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
};

/**
 * Updates the status of a specific goal via the API without authentication.
 * @param goalId - The ID of the goal to update.
 * @param transition - The status transition action.
 * @returns Axios response promise.
 */
export const updateGoalStatusUnauthenticated = (goalId: string, transition: GoalStatusTransition): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/goals/${goalId}`, { transition });
};

/**
 * Sends a raw PATCH request to the goal endpoint (for testing invalid inputs).
 * @param token - The authentication token (raw JWT).
 * @param goalId - The ID of the goal to update.
 * @param payload - The raw payload object to send.
 * @returns Axios response promise.
 */
export const patchGoalRaw = (token: string, goalId: string, payload: any): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/goals/${goalId}`, payload, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Sends an unauthenticated raw PATCH request to the goal endpoint.
 * @param goalId - The ID of the goal to update.
 * @param payload - The raw payload object to send.
 * @returns Axios response promise.
 */
export const patchGoalRawUnauthenticated = (goalId: string, payload: any): Promise<AxiosResponse> => {
    return axios.patch(`${API_BASE_URL}/api/v1/goals/${goalId}`, payload);
}; 