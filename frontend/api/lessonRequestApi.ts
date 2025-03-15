import { LessonRequest, LessonType, Address } from '../types/lesson';
import apiClient from './apiClient';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export interface CreateLessonRequestPayload {
  type: LessonType;
  startTime: string; // ISO string format
  durationMinutes: number;
  addressObj: Address; // Now required
  studentId: string;
}

/**
 * Create a new lesson request
 * @param data - Lesson request data
 * @returns Created lesson request
 */
export const createLessonRequest = async (data: CreateLessonRequestPayload): Promise<LessonRequest> => {
  try {
    const response = await apiClient.post('/lesson-requests', data);
    return response.data;
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
    const response = await apiClient.get(`/lesson-requests/${id}`);
    return response.data;
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
    const response = await apiClient.get(`/lesson-requests/student/${studentId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching student lesson requests:', error);
    throw error;
  }
}; 