import request from 'supertest';
import { Student } from '@shared/models/Student'; // Shared model for response type
// Import user utils
import { createTestStudent, loginTestUser } from './utils/user.utils';
// Import student utils
import { getStudentById, getStudentByIdUnauthenticated } from './utils/student.utils';
import { UserType } from '@shared/models/UserType'; // Import UserType enum

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

// Counter for unique emails to ensure test independence
let studentCounter = 0;

describe('API Integration: /api/v1/students', () => {

    // Helper function to generate unique student data - KEEPING for variation
    // But note that createTestStudent util uses its own data
    const generateUniqueStudentData = () => {
        studentCounter++;
        const uniqueEmail = `test.student.${Date.now()}.${studentCounter}@example.com`;
        return {
            firstName: 'Test',
            lastName: `Student${studentCounter}`,
            email: uniqueEmail,
            password: 'testPassword123',
            phoneNumber: '555-123-4567',
            dateOfBirth: '1995-08-15' // YYYY-MM-DD format
        };
    };

    // --- Test Student Creation via Auth Endpoint --- 
    // Note: These tests now implicitly test POST /api/v1/auth/register for UserType.STUDENT
    describe('POST /api/v1/auth/register (for Students)', () => {
        it('should create a new student successfully via util (201 Created)', async () => {
            // Use the util which calls POST /api/v1/auth/register
            const { user: createdStudent } = await createTestStudent();

            // Validate the returned user object structure
            expect(createdStudent).toBeDefined();
            expect(createdStudent.id).toEqual(expect.any(String));
            expect(createdStudent.email).toMatch(/test.student.\d+@example.com/); // Match pattern from util
            expect(createdStudent.firstName).toBeDefined();
            expect(createdStudent.lastName).toBeDefined();
            expect(createdStudent.phoneNumber).toBeDefined();
            expect(createdStudent.dateOfBirth).toBeDefined();
            expect(createdStudent.isActive).toBe(true);
            expect(createdStudent).not.toHaveProperty('password');
        });

        it('should return 409 Conflict if email already exists', async () => {
            // Create the student first using the util
            const { user: firstStudent } = await createTestStudent();

            // Attempt to create again with the same email by calling register directly
            // (The util generates unique emails, so we need a direct call here)
            const studentData = {
                firstName: 'Conflict', lastName: 'Test', email: firstStudent.email, // Use existing email
                password: 'password123', phoneNumber: '111-000-9999', dateOfBirth: '2000-01-01'
            };

            const secondResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/register')
                .send({ ...studentData, userType: UserType.STUDENT });

            expect(secondResponse.status).toBe(409);
            expect(secondResponse.body.error).toContain('already exists');
        });

        // Bad Request tests targeting the registration endpoint
        it('should return 400 Bad Request if required field `email` is missing', async () => {
            const studentData = generateUniqueStudentData(); // Use this to get a full object
            delete (studentData as any).email;

            const response = await request(API_BASE_URL!)
                .post('/api/v1/auth/register') // Target register endpoint
                .send({ ...studentData, userType: UserType.STUDENT });

            expect(response.status).toBe(400);
            // Check the 'error' property
            expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 Bad Request if dateOfBirth format is invalid', async () => {
            const studentData = generateUniqueStudentData();
            studentData.dateOfBirth = 'invalid-date-string';

            const response = await request(API_BASE_URL!)
                .post('/api/v1/auth/register') // Target register endpoint
                .send({ ...studentData, userType: UserType.STUDENT });

            // Expect 400 status because studentService validation should fail
            expect(response.status).toBe(400);
            // Expect the specific error message from studentService validation
            expect(response.body.error).toBe('Invalid dateOfBirth. Must be a valid Date object.');
        });

        it('should return 400 Bad Request if required field `firstName` is missing', async () => {
            const studentData = generateUniqueStudentData();
            delete (studentData as any).firstName;

            const response = await request(API_BASE_URL!)
                .post('/api/v1/auth/register') // Target register endpoint
                .send({ ...studentData, userType: UserType.STUDENT });

            expect(response.status).toBe(400);
            // Check the 'error' property
            expect(response.body.error).toContain('Missing required fields');
        });

        it('should return 400 Bad Request if phoneNumber format is invalid', async () => {
            const studentData = generateUniqueStudentData();
            studentData.phoneNumber = 'invalid-phone-number';

            const response = await request(API_BASE_URL!)
                .post('/api/v1/auth/register') // Target register endpoint
                .send({ ...studentData, userType: UserType.STUDENT });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid phone number format.'); // Check error property
        });
    });

    // --- Test GET /:id --- 
    describe('GET /:id', () => {
        let student1: Student;
        let student1Token: string;
        let student2: Student;

        // Create users and login before running tests in this block
        beforeAll(async () => {
            // Create student 1 using the util
            const { user: s1, password: s1Password } = await createTestStudent();
            student1 = s1;
            // Login student 1 to get token
            student1Token = await loginTestUser(s1.email, s1Password, UserType.STUDENT);

            // Create student 2 using the util
            const { user: s2 } = await createTestStudent();
            student2 = s2;
        });

        it('should get own student details successfully (200 OK)', async () => {
            // Fetch student 1 using their own token
            const response = await getStudentById(student1Token, student1.id);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const fetchedStudent: Student = response.body;
            expect(fetchedStudent).toBeDefined();
            expect(fetchedStudent.id).toEqual(student1.id);
            expect(fetchedStudent.email).toEqual(student1.email);
            // ... other property checks ...
            expect(fetchedStudent).not.toHaveProperty('password');
        });

        it('should return 404 Not Found for non-existent student ID', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';
            // Use the utility function with the token
            const response = await getStudentById(student1Token, nonExistentId);

            expect(response.status).toBe(404);
            // Keep message check as it comes from the error handler
            expect(response.body.message).toContain('not found');
        });

        it('should return 404 Not Found for invalid student ID format (non-UUID)', async () => {
            const invalidId = 'this-is-not-a-valid-uuid';
            // Use the utility function with the token
            const response = await getStudentById(student1Token, invalidId);

            expect(response.status).toBe(404);
            // Keep message check
            expect(response.body.message).toContain('not found');
        });

        // Authentication/Authorization tests
        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use the unauthenticated utility function
            const response = await getStudentByIdUnauthenticated(student1.id);

            // Check status and error property based on authMiddleware response format
            expect(response.status).toBe(401);
            // Remove specific message check, rely on authMiddleware/error handler
            expect(response.body.error).toBeDefined();
        });

        it('should return 403 Forbidden if user tries to access another student\'s details', async () => {
            // Attempt to fetch student 2 using student 1's token via utility
            const response = await getStudentById(student1Token, student2.id);

            // This test assumes authorization rules prevent this
            expect(response.status).toBe(403);
            // Check the error property based on central error handler format
            expect(response.body.error).toContain('Forbidden'); // Or specific authz error message
        });

    });

    // Add describe blocks for other student endpoints (e.g., PATCH /:id, DELETE /:id) when implemented

}); 