import axios, { AxiosResponse } from 'axios';
import { CreateLessonSummaryDto } from '../../server/lessonSummary/lessonSummary.dto.js';
import { LessonSummary } from '@shared/models/LessonSummary';

const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

/**
 * Creates a lesson summary.
 * @param token The auth token.
 * @param data The data for creating the lesson summary.
 * @returns A promise that resolves to the AxiosResponse.
 */
export const createLessonSummary = async (
    token: string,
    data: CreateLessonSummaryDto
): Promise<AxiosResponse<LessonSummary>> => {
    return axios.post<LessonSummary>(
        `${API_BASE_URL}/api/v1/summary`,
        data,
        {
            headers: { 'Authorization': `Bearer ${token}` },
        }
    );
};

// TODO: Add other utility functions as needed, e.g., for error cases or specific scenarios.

// Example of an unauthenticated request utility, if needed:
/*
export const createLessonSummaryUnauthenticated = async (
    data: CreateLessonSummaryDto
): Promise<AxiosResponse<LessonSummary>> => {
    return axios.post<LessonSummary>(
        `${API_BASE_URL}/api/v1/summary`,
        data
        // No auth header
    );
};
*/ 