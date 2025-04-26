import request from 'supertest';
import { UserType } from '@shared/models/UserType';
import { Student } from '@shared/models/Student'; // Assuming Teacher model might also be needed if return type is specific

// Assuming the API base URL is available via environment variable
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    // It's good practice to check for env vars in helpers too, or ensure they run in an env where it's set.
    throw new Error('[User Test Utils] Missing required environment variable: VITE_API_BASE_URL.');
}

// Helper function to create a student 
export const createTestStudent = async () => {
    const uniqueEmail = `test.student.${Date.now()}@example.com`; // Simplified email
    const password = 'testPasswordStudent123';
    const studentData = {
        firstName: 'TestUtil',
        lastName: 'Student',
        email: uniqueEmail,
        password: password,
        phoneNumber: '111-222-3333',
        dateOfBirth: '2002-02-02'
    };

    const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({ ...studentData, userType: UserType.STUDENT });

    if (response.status !== 201) {
        console.error('Failed to create test student via util:', response.body);
        throw new Error(`Util failed to create test student. Status: ${response.status}`);
    }
    return { user: response.body.user as Student, password };
};

// Helper function to create a teacher
export const createTestTeacher = async () => {
    const uniqueEmail = `test.teacher.${Date.now()}@example.com`; // Simplified email
    const password = 'testPasswordTeacher123';
    const teacherData = {
        firstName: 'TestUtil',
        lastName: 'Teacher',
        email: uniqueEmail,
        password: password,
        phoneNumber: '444-555-6666',
        dateOfBirth: '1990-09-09'
    };

    const response = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({ ...teacherData, userType: UserType.TEACHER });

    if (response.status !== 201) {
        console.error('Failed to create test teacher via util:', response.body);
        throw new Error(`Util failed to create test teacher. Status: ${response.status}`);
    }
    // Assuming the register endpoint returns the user object for teachers too
    return { user: response.body.user, password };
};

// Helper function to log in a user and return the access token
export const loginTestUser = async (email: string, password: string, userType: UserType): Promise<string> => {
    const response = await request(API_BASE_URL)
        .post('/api/v1/auth/login')
        .send({ email, password, userType });

    if (response.status !== 200 || !response.body.accessToken) {
        console.error('Failed to login test user via util or get access token:', response.body);
        throw new Error(`Util failed to login test user. Status: ${response.status}`);
    }
    return response.body.accessToken;
}; 