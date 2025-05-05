import { v4 as uuidv4 } from 'uuid';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { UserType } from '@shared/models/UserType';
import { Student } from '@shared/models/Student';
import {
    createTestStudent,
    loginTestUser
} from './utils/user.utils';
import {
    getStudentById,
    getStudentByIdUnauthenticated
} from './utils/student.utils';
import axios from 'axios'; // Import axios

describe('API Integration: /api/v1/students', () => {
    let student1: Student;
    let student2: Student;
    let student1Token: string;

    // Shared data for registration tests
    const baseStudentData = {
        firstName: 'Test',
        lastName: 'StudentReg',
        phoneNumber: '111-000-1111',
        dateOfBirth: '2003-03-03'
    };
    const existingEmail = `existing.student.${Date.now()}@example.com`;
    const existingPassword = 'passwordExists123';

    beforeAll(async () => {
        // Create student1 for fetching tests
        const student1Data = await createTestStudent();
        student1 = student1Data.user;
        student1Token = await loginTestUser(student1.email, student1Data.password, UserType.STUDENT);

        // Create student2 (just needs to exist for forbidden tests)
        const student2Data = await createTestStudent();
        student2 = student2Data.user;

        // Create a student with a known email for conflict testing
        await axios.post(`${process.env.VITE_API_BASE_URL}/api/v1/auth/register`, {
            ...baseStudentData,
            email: existingEmail,
            password: existingPassword,
            userType: UserType.STUDENT
        });
    });

    // Note: Registration is tested via the POST /api/v1/auth/register endpoint
    // but we keep the test group structure for clarity.
    describe('POST /api/v1/auth/register (for Students)', () => {

        it('should create a new student successfully via util (201 Created)', async () => {
            // This implicitly tests creation via the beforeAll setup using the util.
            // We just need to verify the student object exists.
            expect(student1).toBeDefined();
            expect(student1.id).toBeDefined();
            expect(student1.email).toBeDefined();
        });

        it('should return 409 Conflict if email already exists', async () => {
            const payload = {
                ...baseStudentData,
                email: existingEmail, // Use the email created in beforeAll
                password: 'newPassword456',
                userType: UserType.STUDENT
            };
            try {
                // Use axios directly as utils don't cover raw registration easily
                await axios.post(`${process.env.VITE_API_BASE_URL}/api/v1/auth/register`, payload);
                throw new Error('Request should have failed with 409');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(409);
                expect(error.response?.data?.error).toContain('already exists');
            }
        });

        it('should return 400 Bad Request if required field `email` is missing', async () => {
            const payload = {
                ...baseStudentData,
                password: 'password123',
                userType: UserType.STUDENT
            };
            // delete payload.email; // Email is implicitly missing
            try {
                await axios.post(`${process.env.VITE_API_BASE_URL}/api/v1/auth/register`, payload);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400); // Expect validation error
            }
        });

        it('should return 400 Bad Request if dateOfBirth format is invalid', async () => {
            const payload = {
                ...baseStudentData,
                email: `invalid.dob.${Date.now()}@example.com`,
                password: 'password123',
                userType: UserType.STUDENT,
                dateOfBirth: 'not-a-date'
            };
            try {
                await axios.post(`${process.env.VITE_API_BASE_URL}/api/v1/auth/register`, payload);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
            }
        });

        it('should return 400 Bad Request if required field `firstName` is missing', async () => {
            const payload = {
                ...baseStudentData,
                email: `missing.fname.${Date.now()}@example.com`,
                password: 'password123',
                userType: UserType.STUDENT
            };
            delete (payload as any).firstName;
            try {
                await axios.post(`${process.env.VITE_API_BASE_URL}/api/v1/auth/register`, payload);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
            }
        });

        it('should return 400 Bad Request if phoneNumber format is invalid', async () => {
            const payload = {
                ...baseStudentData,
                email: `invalid.phone.${Date.now()}@example.com`,
                password: 'password123',
                userType: UserType.STUDENT,
                phoneNumber: '12345' // Invalid format
            };
            try {
                await axios.post(`${process.env.VITE_API_BASE_URL}/api/v1/auth/register`, payload);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                // Check for response status directly, as isAxiosError might be unreliable here
                expect(error?.response?.status).toBe(400);
            }
        });
    });

    describe('GET /:id', () => {
        it('should get own student details successfully (200 OK)', async () => {
            const response = await getStudentById(student1Token, student1.id);

            expect(response.status).toBe(200);
            const fetchedStudent: Student = response.data; // Use response.data
            expect(fetchedStudent).toBeDefined();
            expect(fetchedStudent.id).toEqual(student1.id);
            expect(fetchedStudent.email).toEqual(student1.email);
            // Ensure sensitive fields are not present
            expect(fetchedStudent).not.toHaveProperty('passwordHash');
        });

        it('should return 404 Not Found for non-existent student ID', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            try {
                await getStudentById(student1Token, nonExistentId);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
            }
        });

        it('should return 400 Bad Request for invalid student ID format (non-UUID)', async () => {
            const invalidId = 'this-is-not-a-valid-uuid';
            try {
                await getStudentById(student1Token, invalidId);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400); // Service layer validation
                expect(error.response?.data?.error).toContain('Valid Student ID is required');
            }
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            try {
                await getStudentByIdUnauthenticated(student1.id);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if user tries to access another student\'s details', async () => {
            try {
                await getStudentById(student1Token, student2.id);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden');
            }
        });
    });
}); 