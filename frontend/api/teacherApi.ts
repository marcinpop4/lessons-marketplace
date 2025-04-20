import apiClient from './apiClient';
import { Lesson } from '@shared/models/Lesson'; // Import the shared Lesson model
import { LessonStatusValue } from '@shared/models/LessonStatus'; // Needed for the status enum
import { LessonType } from '@shared/models/LessonType'; // Needed for the lesson type enum

// Define the expected structure, reflecting the selected fields from the API
export interface TeacherLessonApiResponseItem {
    id: string;
    createdAt: string;
    updatedAt: string;
    currentStatus: {
        id: string;
        status: LessonStatusValue;
        context: string | null;
        createdAt: string;
    } | null;
    quote: {
        id: string;
        costInCents: number;
        hourlyRateInCents: number; // Assume API provides this for the quote
        expiresAt: string;
        lessonRequestId: string;
        teacherId: string;
        createdAt: string;
        updatedAt: string;
        // Teacher now only has selected fields
        teacher: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
            // No phoneNumber, dateOfBirth, etc.
        };
        lessonRequest: {
            id: string;
            type: LessonType; // Use the enum directly if API returns it as such, otherwise string
            startTime: string;
            durationMinutes: number;
            studentId: string;
            addressId: string;
            createdAt: string;
            updatedAt: string;
            // Student now only has selected fields
            student: {
                id: string;
                firstName: string;
                lastName: string;
                email: string;
                // No phoneNumber, dateOfBirth, etc.
            };
            address: {
                id: string;
                street: string;
                city: string;
                state: string;
                postalCode: string;
                country: string;
            };
        };
    };
}

/**
 * Fetches all lessons for a specific teacher.
 * 
 * @param teacherId The ID of the teacher whose lessons to fetch.
 * @returns A promise that resolves to an array of lesson data items.
 */
export const getTeacherLessons = async (teacherId: string): Promise<TeacherLessonApiResponseItem[]> => {
    try {
        const response = await apiClient.get<TeacherLessonApiResponseItem[]>(`/api/v1/teachers/${teacherId}/lessons`);
        // Return the raw data. Instantiation will happen in the component.
        return response.data;
    } catch (error) {
        console.error('API Error fetching teacher lessons:', error);
        // Re-throw or handle as appropriate for the application
        throw error;
    }
};

// Add other teacher-related API functions here (e.g., getTeacherProfile, getTeacherStats) 