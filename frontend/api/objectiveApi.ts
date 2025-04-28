import axios from 'axios';
import { Objective } from '@shared/models/Objective.js';
import { ObjectiveStatusValue } from '@shared/models/ObjectiveStatus.js';
import { LessonType } from '@shared/models/LessonType.js';

/**
 * Fetches objectives for a specific student, optionally filtered by lesson type.
 */
export const getStudentObjectives = async (
    studentId: string,
    lessonType?: LessonType
): Promise<Objective[]> => {
    // Construct URLSearchParams for query parameters
    const params = new URLSearchParams();
    params.append('studentId', studentId);
    if (lessonType) {
        params.append('lessonType', lessonType);
    }

    const url = `/api/v1/objectives?${params.toString()}`;

    try {
        // Use axios with withCredentials, consistent with other functions
        const response = await axios.get(url, {
            withCredentials: true,
        });

        // Assuming the API returns Objective[] directly
        // TODO: Add proper mapping/validation if needed
        return response.data as Objective[];

    } catch (error: any) {
        // Log the error and re-throw a consistent error message
        console.error('API Error fetching student objectives:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch student objectives');
    }
};

/**
 * Creates a new objective for a student.
 */
export const createObjective = async (
    studentId: string,
    title: string,
    description: string,
    lessonType: LessonType,
    targetDate: Date
): Promise<Objective> => {
    try {
        // Use relative path
        const response = await axios.post(`/api/v1/objectives`, { // Use relative path, assuming POST /objectives handles studentId from auth
            title,
            description,
            lessonType,
            targetDate: targetDate.toISOString(), // Ensure date is sent in ISO format
        }, {
            withCredentials: true,
        });
        // TODO: Add proper mapping/validation
        return response.data as Objective;
    } catch (error: any) {
        console.error('Error creating objective:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to create objective');
    }
};

/**
 * Updates the status of an objective (specifically to ABANDONED).
 */
export const abandonObjective = async (objectiveId: string): Promise<Objective> => {
    try {
        // Use relative path
        const response = await axios.patch(`/api/v1/objectives/${objectiveId}`, {
            status: ObjectiveStatusValue.ABANDONED
        }, {
            withCredentials: true,
        });
        // TODO: Add proper mapping/validation
        return response.data as Objective;
    } catch (error: any) {
        console.error('Error abandoning objective:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to abandon objective');
    }
};

/**
 * Updates the status of an objective to ACHIEVED.
 */
export const achieveObjective = async (objectiveId: string): Promise<Objective> => {
    try {
        // Use relative path
        const response = await axios.patch(`/api/v1/objectives/${objectiveId}`, {
            status: ObjectiveStatusValue.ACHIEVED
        }, {
            withCredentials: true,
        });
        // TODO: Add proper mapping/validation
        return response.data as Objective;
    } catch (error: any) {
        console.error('Error achieving objective:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to achieve objective');
    }
}; 