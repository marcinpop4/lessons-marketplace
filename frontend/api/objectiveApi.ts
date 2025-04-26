import axios from 'axios';
import { Objective } from '@shared/models/Objective.js';
import { ObjectiveStatusValue } from '@shared/models/ObjectiveStatus.js';
import { LessonType } from '@shared/models/LessonType.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

/**
 * Fetches all objectives for a given student.
 */
export const getStudentObjectives = async (studentId: string): Promise<Objective[]> => {
    try {
        const response = await axios.get(`${API_BASE_URL}/student/${studentId}/objectives`, {
            withCredentials: true, // Send cookies if needed for auth
        });
        // TODO: Add proper mapping/validation if the backend doesn't return Objective instances directly
        return response.data as Objective[];
    } catch (error: any) {
        console.error('Error fetching student objectives:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to fetch objectives');
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
        const response = await axios.post(`${API_BASE_URL}/student/${studentId}/objectives`, {
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
        const response = await axios.patch(`${API_BASE_URL}/objectives/${objectiveId}`, {
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
        const response = await axios.patch(`${API_BASE_URL}/objectives/${objectiveId}`, {
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