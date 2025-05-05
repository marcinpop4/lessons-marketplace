import axios from 'axios';
import { UserType } from '../../shared/models/UserType';
import { Student } from '../../shared/models/Student'; // Assuming Teacher model might also be needed if return type is specific
import { Teacher } from '../../shared/models/Teacher';
import { LessonType } from '../../shared/models/LessonType';
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

    try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
            ...studentData,
            userType: UserType.STUDENT
        });

        if (response.status !== 201 || !response.data?.user) {
            console.error('Failed to create test student via util:', response.data);
            throw new Error(`Util failed to create test student. Status: ${response.status}`);
        }
        return { user: response.data.user as Student, password };
    } catch (error: any) {
        console.error('Error during test student creation via util:', error.response?.data || error.message);
        throw new Error(`Util failed to create test student: ${error.message}`);
    }
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

    let createdTeacher: Teacher;
    try {
        // 1. Register the teacher using axios
        const registerResponse = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
            ...teacherData,
            userType: UserType.TEACHER
        });

        if (registerResponse.status !== 201 || !registerResponse.data?.user) {
            console.error('Failed to create test teacher via util:', registerResponse.data);
            throw new Error(`Util failed to create test teacher. Status: ${registerResponse.status}`);
        }
        createdTeacher = registerResponse.data.user as Teacher;

    } catch (error: any) {
        console.error('Error during test teacher registration via util:', error.response?.data || error.message);
        throw new Error(`Util failed during test teacher registration: ${error.message}`);
    }

    try {
        // 2. Log in the new teacher to get their token (using the now axios-based loginTestUser)
        const teacherToken = await loginTestUser(createdTeacher.email, password, UserType.TEACHER);

        // 3. Determine which rates to create (default or provided)
        const rates = ratesToCreate && ratesToCreate.length > 0
            ? ratesToCreate
            : [{ lessonType: LessonType.VOICE, rateInCents: 4500 }]; // Default rate

        // 4. Create the rates using the token and utility
        // IMPORTANT: createTestTeacherRate still uses supertest and needs refactoring!
        // This part will likely fail until teacherRate.utils.ts is updated.
        for (const rateInfo of rates) {
            await createTestTeacherRate(
                teacherToken,
                rateInfo.lessonType,
                rateInfo.rateInCents
            );
        }
    } catch (setupError: any) {
        console.error(`Util failed during post-registration setup (login/rate creation) for teacher ${createdTeacher.id}:`, setupError.message);
        // Decide if failure to create rates should prevent teacher creation from succeeding
        throw new Error(`Util failed during rate creation/login for teacher ${createdTeacher.id}. Error: ${setupError.message}`);
    }

    // 5. Return the teacher object and password
    return { user: createdTeacher, password };
};

// Helper function to log in a user and return the access token
export const loginTestUser = async (email: string, password: string, userType: UserType): Promise<string> => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email, password, userType
        });

        if (response.status !== 200 || !response.data?.accessToken) {
            console.error('Failed to login test user via util or get access token:', response.data);
            throw new Error(`Util failed to login test user. Status: ${response.status}`);
        }
        return response.data.accessToken;
    } catch (error: any) {
        console.error('Error during login via util:', error.response?.data || error.message);
        throw new Error(`Util failed to login test user ${email}: ${error.message}`);
    }
}; 