import { LessonRequest } from '@shared/models/LessonRequest';
import { Address } from '@shared/models/Address';
import { LessonQuote } from '@shared/models/LessonQuote';
import apiClient from './apiClient';
/**
 * Create a new lesson request
 * @param data - Lesson request data
 * @returns Created lesson request and quotes
 */
export const createLessonRequest = async (data) => {
    try {
        // Ensure startTime is a valid Date object
        if (!(data.startTime instanceof Date) || isNaN(data.startTime.getTime())) {
            throw new Error('Invalid date provided for startTime');
        }
        // Prepare the payload with proper date serialization
        const payload = {
            ...data,
            startTime: data.startTime.toISOString()
        };
        console.log('Sending lesson request data:', payload);
        const response = await apiClient.post('/api/v1/lesson-requests', payload);
        const { lessonRequest: responseData, quotes } = response.data;
        // Ensure proper date instantiation
        const lessonRequest = new LessonRequest(responseData.id, responseData.type, new Date(responseData.startTime), responseData.durationMinutes, new Address(responseData.address.street, responseData.address.city, responseData.address.state, responseData.address.postalCode, responseData.address.country), responseData.student);
        // Transform quotes
        const transformedQuotes = quotes.map(quote => new LessonQuote(quote.id, lessonRequest, quote.teacher, quote.costInCents, new Date(quote.createdAt), new Date(quote.expiresAt), quote.hourlyRateInCents));
        return {
            lessonRequest,
            quotes: transformedQuotes
        };
    }
    catch (error) {
        console.error('Error creating lesson request:', error);
        throw error;
    }
};
/**
 * Get a lesson request by ID
 * @param id - Lesson request ID
 * @returns Lesson request
 */
export const getLessonRequestById = async (id) => {
    try {
        const response = await apiClient.get(`/api/v1/lesson-requests/${id}`);
        const responseData = response.data;
        // Ensure proper date instantiation
        return new LessonRequest(responseData.id, responseData.type, new Date(responseData.startTime), responseData.durationMinutes, new Address(responseData.address.street, responseData.address.city, responseData.address.state, responseData.address.postalCode, responseData.address.country), responseData.student);
    }
    catch (error) {
        console.error('Error fetching lesson request:', error);
        throw error;
    }
};
/**
 * Get all lesson requests for a student
 * @param studentId - Student ID
 * @returns Array of lesson requests
 */
export const getLessonRequestsByStudent = async (studentId) => {
    try {
        const response = await apiClient.get(`/api/v1/lesson-requests/student/${studentId}`);
        const responseData = response.data;
        return responseData.map(data => new LessonRequest(data.id, data.type, new Date(data.startTime), data.durationMinutes, new Address(data.address.street, data.address.city, data.address.state, data.address.postalCode, data.address.country), data.student));
    }
    catch (error) {
        console.error('Error fetching student lesson requests:', error);
        throw error;
    }
};
