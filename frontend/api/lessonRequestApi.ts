import { LessonRequest, LessonType } from '../types/lesson';

// Base API URL - in a real app, this would come from environment variables
const API_BASE_URL = 'http://localhost:3001/api';

export interface CreateLessonRequestPayload {
  type: LessonType;
  startTime: string; // ISO string format
  durationMinutes: number;
  address: string;
  studentId: string;
}

/**
 * Create a new lesson request
 * @param data - Lesson request data
 * @returns Created lesson request
 */
export const createLessonRequest = async (data: CreateLessonRequestPayload): Promise<LessonRequest> => {
  try {
    const response = await fetch(`${API_BASE_URL}/lesson-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create lesson request');
    }

    return response.json();
  } catch (error) {
    console.error('Error creating lesson request:', error);
    throw error;
  }
};

/**
 * Get a lesson request by ID
 * @param id - Lesson request ID
 * @returns Lesson request
 */
export const getLessonRequestById = async (id: string): Promise<LessonRequest> => {
  try {
    const response = await fetch(`${API_BASE_URL}/lesson-requests/${id}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch lesson request');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching lesson request:', error);
    throw error;
  }
};

/**
 * Get all lesson requests for a student
 * @param studentId - Student ID
 * @returns Array of lesson requests
 */
export const getLessonRequestsByStudent = async (studentId: string): Promise<LessonRequest[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/lesson-requests/student/${studentId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch student lesson requests');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching student lesson requests:', error);
    throw error;
  }
}; 