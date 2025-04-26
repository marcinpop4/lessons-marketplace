import request from 'supertest';
import { Address } from '@shared/models/Address'; // Shared model for response structure
import { v4 as uuidv4 } from 'uuid'; // For generating fake IDs
import { UserType } from '@shared/models/UserType'; // Needed for login util
import { Student } from '@shared/models/Student'; // Needed for user util type
import { Teacher } from '@shared/models/Teacher'; // Needed for user util type

// Import user utilities
import { createTestStudent, loginTestUser, createTestTeacher } from './utils/user.utils';
// Import address utilities
import { createAddress, getAddressById, createAddressUnauthenticated, getAddressByIdUnauthenticated } from './utils/address.utils'; // Corrected import path

// REMOVED: Seeded user credentials no longer needed
// const SEEDED_STUDENT_EMAIL = 'ethan.parker@example.com';
// const SEEDED_PASSWORD = '1234';

// API Base URL check moved to utils, removed from here
// const API_BASE_URL = process.env.VITE_API_BASE_URL;

// if (!API_BASE_URL) {
//    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
// }

// Main describe block for the Address resource
describe('API Integration: /api/v1/addresses', () => {
    // Variables for users created once for the suite
    let testStudent1: Student;
    let student1AccessToken: string;
    let testTeacher1: Teacher; // Use Teacher type
    let teacher1AccessToken: string; // Add teacher token variable

    // REMOVED: Address ID created in old beforeAll
    // let createdAddressIdForGetTest: string | null = null;

    // Shared setup: Create and log in users
    beforeAll(async () => {
        try {
            // Create/Login Student
            const { user: studentUser, password } = await createTestStudent();
            testStudent1 = studentUser;
            student1AccessToken = await loginTestUser(testStudent1.email, password, UserType.STUDENT);

            // Create/Login Teacher
            const { user: teacherUser, password: teacherPassword } = await createTestTeacher();
            testTeacher1 = teacherUser as Teacher; // Cast to Teacher type
            teacher1AccessToken = await loginTestUser(testTeacher1.email, teacherPassword, UserType.TEACHER);

        } catch (error) {
            console.error("Failed setup in beforeAll:", error);
            throw error; // Fail fast if setup fails
        }
    }); // REMOVED explicit timeout, using Jest default

    // Test data for POST/GET tests - define once
    const testAddressData = {
        street: '456 Refactor Ave',
        city: 'Utilville',
        state: 'UT',
        postalCode: '99887',
        country: 'Refactorland'
    };

    // --- Tests for POST / --- //
    describe('POST /', () => {
        it('should create a new address successfully for an authenticated student (201)', async () => {
            if (!student1AccessToken) throw new Error('Student 1 auth token not available for POST test');

            // Use the utility function
            const response = await createAddress(student1AccessToken, testAddressData);

            expect(response.status).toBe(201);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const createdAddress: Address = response.body;
            expect(createdAddress).toBeDefined();
            expect(createdAddress.id).toBeDefined();
            expect(createdAddress.street).toEqual(testAddressData.street);
            expect(createdAddress.city).toEqual(testAddressData.city);
            expect(createdAddress.state).toEqual(testAddressData.state);
            expect(createdAddress.postalCode).toEqual(testAddressData.postalCode);
            expect(createdAddress.country).toEqual(testAddressData.country);
            expect(createdAddress.createdAt).toBeDefined();
            expect(createdAddress.updatedAt).toBeDefined();
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            // Use the unauthenticated utility function
            const response = await createAddressUnauthenticated(testAddressData);

            expect(response.status).toBe(401);
        });

        it('should return 400 Bad Request if required fields are missing (e.g., city)', async () => {
            if (!student1AccessToken) throw new Error('Student 1 auth token not available for POST test');

            const incompleteData = { ...testAddressData }; // Clone test data
            delete (incompleteData as any).city; // Intentionally remove a field

            // Use the utility function
            const response = await createAddress(student1AccessToken, incompleteData);

            expect(response.status).toBe(400);
            // The actual error message might come from validation middleware or the controller/service
            // Assert against the specific message received
            expect(response.body.message || response.body.error).toContain('Missing required address fields.');
        });

        it('should return 403 Forbidden if a Teacher tries to create an address', async () => {
            if (!teacher1AccessToken) throw new Error('Teacher token not available for POST test');

            // Use the utility function with teacher token
            const response = await createAddress(teacher1AccessToken, testAddressData);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Forbidden'); // From checkRole middleware
        });
    }); // End POST describe

    // --- Tests for GET /:id --- //
    describe('GET /:id', () => {
        let addressForGetTest: Address; // Store address created before each GET test

        // Create a fresh address before each test in this suite
        beforeEach(async () => {
            if (!student1AccessToken) throw new Error('Student 1 auth token not available for GET beforeEach');

            // Use the utility function to create an address for this test run
            const postResponse = await createAddress(student1AccessToken, testAddressData);

            if (postResponse.status !== 201 || !postResponse.body.id) {
                throw new Error('Failed to create address via POST during GET beforeEach setup.');
            }
            addressForGetTest = postResponse.body as Address;
        });

        it('should fetch an address by its ID successfully (200) for the owning student', async () => {
            if (!addressForGetTest) throw new Error('Address not created in beforeEach for GET test');
            if (!addressForGetTest.id) throw new Error('Address ID is missing for GET test');

            // Use the utility function
            const response = await getAddressById(student1AccessToken, addressForGetTest.id);

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const address: Address = response.body;
            expect(address).toBeDefined();
            expect(address.id).toEqual(addressForGetTest.id);
            expect(address.street).toEqual(testAddressData.street);
            expect(address.city).toEqual(testAddressData.city);
            expect(address.state).toEqual(testAddressData.state);
            expect(address.postalCode).toEqual(testAddressData.postalCode);
            expect(address.country).toEqual(testAddressData.country);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!addressForGetTest) throw new Error('Address not created in beforeEach for GET test');
            if (!addressForGetTest.id) throw new Error('Address ID is missing for GET test');

            // Use the unauthenticated utility function
            const response = await getAddressByIdUnauthenticated(addressForGetTest.id);
            expect(response.status).toBe(401);
        });

        it('should return 403 Forbidden if a teacher tries to fetch', async () => {
            if (!addressForGetTest) throw new Error('Address not created in beforeEach for GET test');
            if (!addressForGetTest.id) throw new Error('Address ID is missing for GET test');
            if (!teacher1AccessToken) throw new Error('Teacher token not available for GET test');

            // Use the utility function with teacher token
            const response = await getAddressById(teacher1AccessToken, addressForGetTest.id);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Forbidden'); // From checkRole middleware
        });

        // Note: A test for another student trying to fetch might be redundant
        // if the route only allows students AND the address isn't linked to a user directly.
        // If addresses WERE linked, we'd need an ownership check in the controller.
        // For now, the checkRole is sufficient based on the current route setup.

        it('should return 404 Not Found for a non-existent address ID (valid UUID) when authenticated', async () => {
            const fakeId = uuidv4();
            // Use the utility function
            const response = await getAddressById(student1AccessToken, fakeId);
            expect(response.status).toBe(404);
            expect(response.body.message).toEqual(`Address with ID ${fakeId} not found.`);
        });

        it('should return 404 Not Found for an invalid ID format when authenticated', async () => {
            const invalidId = 'this-is-not-a-valid-uuid';
            // Use the utility function
            const response = await getAddressById(student1AccessToken, invalidId);
            expect(response.status).toBe(404);
            expect(response.body.message).toEqual(`Address with ID ${invalidId} not found.`);
        });
    }); // End GET /:id describe

}); // End main describe 