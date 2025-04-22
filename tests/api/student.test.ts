import request from 'supertest';
import { Student } from '@shared/models/Student'; // Shared model for response type

const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL.');
}

// Counter for unique emails
let studentCounter = 0;

describe('API Integration: /api/v1/students', () => {

    // Function to generate unique student data for each test
    const generateUniqueStudentData = () => {
        studentCounter++;
        const uniqueEmail = `test.student.${Date.now()}.${studentCounter}@example.com`;
        return {
            firstName: 'Test',
            lastName: `Student${studentCounter}`,
            email: uniqueEmail,
            password: 'testPassword123',
            phoneNumber: '555-123-4567',
            dateOfBirth: '1995-08-15' // Use YYYY-MM-DD format
        };
    };

    describe('POST /', () => {
        it('should create a new student successfully (201)', async () => {
            const studentData = generateUniqueStudentData();

            const response = await request(API_BASE_URL!)
                .post('/api/v1/students')
                .send(studentData);

            expect(response.status).toBe(201);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const createdStudent: Student = response.body;
            expect(createdStudent).toBeDefined();
            expect(createdStudent.id).toBeDefined();
            expect(createdStudent.email).toEqual(studentData.email);
            expect(createdStudent.firstName).toEqual(studentData.firstName);
            expect(createdStudent.lastName).toEqual(studentData.lastName);
            expect(createdStudent.phoneNumber).toEqual(studentData.phoneNumber);
            // Dates need careful comparison
            expect(new Date(createdStudent.dateOfBirth).toISOString().split('T')[0]).toEqual(studentData.dateOfBirth);
            expect(createdStudent.isActive).toBe(true);
            // Password should NOT be returned
            expect(createdStudent).not.toHaveProperty('password');
        });

        it('should return 409 Conflict if email already exists', async () => {
            const studentData = generateUniqueStudentData();

            // Create the student first
            const firstResponse = await request(API_BASE_URL!)
                .post('/api/v1/students')
                .send(studentData);
            expect(firstResponse.status).toBe(201);

            // Attempt to create again with the same email
            const secondResponse = await request(API_BASE_URL!)
                .post('/api/v1/students')
                .send(studentData);

            expect(secondResponse.status).toBe(409); // Conflict
            expect(secondResponse.body.message).toContain('already exists');
        });

        it('should return 400 Bad Request if required fields are missing (e.g., email)', async () => {
            const studentData = generateUniqueStudentData();
            delete (studentData as any).email; // Remove email

            const response = await request(API_BASE_URL!)
                .post('/api/v1/students')
                .send(studentData);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Missing required fields');
        });

        it('should return 400 Bad Request if dateOfBirth is invalid', async () => {
            const studentData = generateUniqueStudentData();
            studentData.dateOfBirth = 'invalid-date'; // Invalid date format

            const response = await request(API_BASE_URL!)
                .post('/api/v1/students')
                .send(studentData);

            expect(response.status).toBe(400);
            // The controller might throw before the service, or the service throws
            // Check for a message indicating bad date format or similar
            expect(response.body.message).toBeDefined();
        });

        // Add more tests for other missing fields or invalid data (e.g., phone format) if needed
    });

    describe('GET /:id', () => {
        it('should get student details successfully (200)', async () => {
            // First create a student
            const studentData = generateUniqueStudentData();
            const createResponse = await request(API_BASE_URL!)
                .post('/api/v1/students')
                .send(studentData);
            expect(createResponse.status).toBe(201);

            const createdStudent: Student = createResponse.body;

            // Now fetch the student details
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/students/${createdStudent.id}`);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const fetchedStudent: Student = response.body;
            expect(fetchedStudent).toBeDefined();
            expect(fetchedStudent.id).toEqual(createdStudent.id);
            expect(fetchedStudent.email).toEqual(studentData.email);
            expect(fetchedStudent.firstName).toEqual(studentData.firstName);
            expect(fetchedStudent.lastName).toEqual(studentData.lastName);
            expect(fetchedStudent.phoneNumber).toEqual(studentData.phoneNumber);
            expect(new Date(fetchedStudent.dateOfBirth).toISOString().split('T')[0]).toEqual(studentData.dateOfBirth);
            expect(fetchedStudent.isActive).toBe(true);
            // Password should NOT be returned
            expect(fetchedStudent).not.toHaveProperty('password');
        });

        it('should return 404 Not Found for non-existent student ID', async () => {
            const nonExistentId = 'non-existent-id';
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/students/${nonExistentId}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('not found');
        });

        it('should return 404 Not Found for invalid student ID format', async () => {
            const invalidId = 'invalid-id-format';
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/students/${invalidId}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBeDefined();
        });
    });

    // Add describe blocks for other student endpoints (GET /:id, etc.) if they are implemented later

}); 