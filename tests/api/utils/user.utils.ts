import request from 'supertest';
import { UserType } from '@shared/models/UserType';
import { Student } from '@shared/models/Student'; // Assuming Teacher model might also be needed if return type is specific
import { Teacher } from '@shared/models/Teacher';
import { LessonType } from '@shared/models/LessonType';
import { createTestTeacherRate } from './teacherRate.utils';

// Assuming the API base URL is available via environment variable
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    // It's good practice to check for env vars in helpers too, or ensure they run in an env where it's set.
    throw new Error('[User Test Utils] Missing required environment variable: VITE_API_BASE_URL.');
}

// Type definition for the rate creation parameter
type RateCreationInfo = { lessonType: LessonType; rateInCents: number };

// Helper function to create a student 
export const createTestStudent = async () => {
    // Add random suffix to timestamp for better uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueEmail = `test.student.${Date.now()}_${randomSuffix}@example.com`;
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

// Helper function to create a teacher AND associated default/specified rates
export const createTestTeacher = async (ratesToCreate?: RateCreationInfo[]) => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const uniqueEmail = `test.teacher.${Date.now()}_${randomSuffix}@example.com`;
    const password = 'testPasswordTeacher123';
    const teacherData = {
        firstName: 'TestUtil',
        lastName: 'Teacher',
        email: uniqueEmail,
        password: password,
        phoneNumber: '444-555-6666',
        dateOfBirth: '1990-09-09'
    };

    // 1. Register the teacher
    const registerResponse = await request(API_BASE_URL)
        .post('/api/v1/auth/register')
        .send({ ...teacherData, userType: UserType.TEACHER });

    if (registerResponse.status !== 201) {
        console.error('Failed to create test teacher via util:', registerResponse.body);
        throw new Error(`Util failed to create test teacher. Status: ${registerResponse.status}`);
    }
    const createdTeacher = registerResponse.body.user as Teacher;

    // 2. Log in the new teacher to get their token
    const teacherToken = await loginTestUser(createdTeacher.email, password, UserType.TEACHER);

    // 3. Determine which rates to create (default or provided)
    const rates = ratesToCreate && ratesToCreate.length > 0
        ? ratesToCreate
        : [{ lessonType: LessonType.VOICE, rateInCents: 4500 }]; // Default rate

    // 4. Create the rates using the token and utility
    try {
        for (const rateInfo of rates) {
            await createTestTeacherRate(
                `Bearer ${teacherToken}`,
                rateInfo.lessonType,
                rateInfo.rateInCents
            );
        }
    } catch (rateError) {
        console.error(`Util failed to create rates for teacher ${createdTeacher.id}:`, rateError);
        // Decide if failure to create rates should prevent teacher creation from succeeding
        // For testing, it might be better to throw here to indicate incomplete setup.
        throw new Error(`Util failed during rate creation for teacher ${createdTeacher.id}. Error: ${rateError}`);
    }

    // 5. Return the teacher object and password
    return { user: createdTeacher, password };
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