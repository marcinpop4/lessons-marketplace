import apiClient from './apiClient';
import { Goal } from '@shared/models/Goal';
import { GoalStatusTransition } from '@shared/models/GoalStatus'; // Import transition enum

/**
 * Fetch all goals for a specific lesson.
 * @param lessonId The ID of the lesson.
 * @returns A promise resolving to an array of Goal objects.
 */
export const getGoalsByLessonId = async (lessonId: string): Promise<Goal[]> => {
    try {
        const response = await apiClient.get(`/api/v1/lessons/${lessonId}/goals`);
        // TODO: Add validation/instantiation if API returns plain data
        return response.data as Goal[];
    } catch (error) {
        console.error(`Error fetching goals for lesson ${lessonId}:`, error);
        throw error;
    }
};

/**
 * Create a new goal for a lesson.
 * @param lessonId The ID of the lesson.
 * @param title The title of the goal.
 * @param description The description of the goal.
 * @param estimatedLessonCount The estimated number of lessons.
 * @returns A promise resolving to the created Goal object.
 */
export const createGoal = async (lessonId: string, title: string, description: string, estimatedLessonCount: number): Promise<Goal> => {
    try {
        const response = await apiClient.post('/api/v1/goals', { lessonId, title, description, estimatedLessonCount });
        // TODO: Add validation/instantiation if API returns plain data
        return response.data as Goal;
    } catch (error) {
        console.error('Error creating goal:', error);
        throw error;
    }
};

/**
 * Abandons (soft deletes) a goal by setting its status to ABANDONED.
 * @param goalId The ID of the goal to abandon.
 * @returns A promise resolving to the updated Goal object (now abandoned).
 */
export const abandonGoal = async (goalId: string): Promise<Goal> => {
    try {
        const response = await apiClient.patch(`/api/v1/goals/${goalId}`, {
            transition: GoalStatusTransition.ABANDON
        });
        // TODO: Add validation/instantiation if API returns plain data
        return response.data as Goal;
    } catch (error) {
        console.error(`Error abandoning goal ${goalId}:`, error);
        throw error;
    }
};

/**
 * Updates the status of a specific goal using a transition.
 * @param goalId The ID of the goal to update.
 * @param transition The transition action to perform.
 * @param context Optional context data for the status change.
 * @returns A promise resolving to the updated Goal object.
 */
export const updateGoalStatus = async (goalId: string, transition: GoalStatusTransition, context?: any): Promise<Goal> => {
    const url = `/api/v1/goals/${goalId}`; // Define URL for logging
    const method = 'PATCH'; // Define method for logging
    try {
        const response = await apiClient.patch(url, { transition, context });
        return response.data as Goal;
    } catch (error: any) { // Catch as any to access error properties
        // Log error response
        const status = error.response?.status || 'N/A';
        const responseData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`${method} ${url} -> Error Status: ${status}, Response: ${responseData}`);
        console.error(`Error updating status for goal ${goalId} via transition ${transition}:`, error); // Keep original detailed error
        throw error;
    }
};

/**
 * Generate AI-powered goal recommendations for a lesson
 * @param lessonId The ID of the lesson to generate recommendations for
 * @returns A promise resolving to an array of goal recommendations
 */
export const generateGoalRecommendations = async (
    lessonId: string
): Promise<Array<{ goal: { title: string; description: string; numberOfLessons: number } }>> => {
    try {
        const response = await apiClient.post(`/api/v1/goals/recommendations/generate?lessonId=${lessonId}`);
        return response.data;
    } catch (error) {
        console.error('Error generating goal recommendations:', error);
        throw error;
    }
};

// Note: If you need a generic updateStatus function for goals:
// export const updateGoalStatus = async (goalId: string, transition: GoalStatusTransition, context?: any): Promise<Goal> => {
//   try {
//     const response = await apiClient.patch(`/api/v1/goals/${goalId}`, { transition, context });
//     return response.data as Goal;
//   } catch (error) {
//     console.error(`Error updating status for goal ${goalId}:`, error);
//     throw error;
//   }
// }; 