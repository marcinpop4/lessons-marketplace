import apiClient from './apiClient';
import { LessonSummary } from '@shared/models/LessonSummary';

export interface CreateLessonSummaryDto {
    lessonId: string;
    summary: string;
    homework: string;
}

/**
 * Creates a new lesson summary for a completed lesson.
 * @param summaryData The data required to create the summary.
 * @returns The created LessonSummary object.
 */
export const createLessonSummary = async (summaryData: CreateLessonSummaryDto): Promise<LessonSummary> => {
    try {
        const response = await apiClient.post<LessonSummary>('/api/v1/summary', summaryData);
        return response.data;
    } catch (error) {
        console.error('Error creating lesson summary:', error);
        // It's good practice to throw the error so the calling component can handle it (e.g., show a user-facing message)
        throw error;
    }
}; 