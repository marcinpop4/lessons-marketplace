import axios from 'axios';
import { AxiosResponse } from 'axios';
import { Student } from '@shared/models/Student';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL in student.utils.ts');
}

// --- GET /students/:id ---

/**
 * Fetches a student by ID using an authentication token.
 * @param token Raw JWT token.
 * @param studentId ID of the student to fetch.
 * @returns Axios response promise.
 */
export const getStudentById = (token: string, studentId: string): Promise<AxiosResponse<Student>> => {
    return axios.get(`${API_BASE_URL}/api/v1/students/${studentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

/**
 * Fetches a student by ID without authentication.
 * @param studentId ID of the student to fetch.
 * @returns Axios response promise.
 */
export const getStudentByIdUnauthenticated = (studentId: string): Promise<AxiosResponse> => {
    return axios.get(`${API_BASE_URL}/api/v1/students/${studentId}`);
}; 