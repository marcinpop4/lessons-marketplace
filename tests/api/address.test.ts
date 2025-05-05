import request from 'supertest';
import { Address } from '@shared/models/Address'; // Shared model for response structure
import { v4 as uuidv4 } from 'uuid'; // For generating fake IDs
import { UserType } from '@shared/models/UserType'; // Needed for login util
import { Student } from '@shared/models/Student'; // Needed for user util type
import { Teacher } from '@shared/models/Teacher'; // Needed for user util type
import axios from 'axios'; // Import axios

// Import user utilities
import { createTestStudent, loginTestUser, createTestTeacher } from './utils/user.utils';
// Import address utilities
import { createAddress, getAddressById, createAddressUnauthenticated, getAddressByIdUnauthenticated } from './utils/address.utils'; // Corrected import pat

// Main describe block for the Address resource
describe('API Integration: /api/v1/addresses', () => {
    // Variables for users created once for the suite
    let testStudent1: Student;
    let student1AccessToken: string;
    let testTeacher1: Teacher; // Use Teacher type
    let teacher1AccessToken: string; // Add teacher token variable

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

            const response = await createAddress(student1AccessToken, testAddressData);

            expect(response.status).toBe(201);
            // expect(response.headers['content-type']).toMatch(/application\/json/); // Axios headers are different

            const createdAddress: Address = response.data; // Use response.data
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
            try {
                await createAddressUnauthenticated(testAddressData);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 400 Bad Request if required fields are missing (e.g., city)', async () => {
            if (!student1AccessToken) throw new Error('Student 1 auth token not available for POST test');

            const incompleteData = { ...testAddressData };
            delete (incompleteData as any).city;

            try {
                await createAddress(student1AccessToken, incompleteData);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message || error.response?.data?.error).toContain('Missing required address fields.'); // Check data for error
            }
        });

        it('should return 403 Forbidden if a Teacher tries to create an address', async () => {
            if (!teacher1AccessToken) throw new Error('Teacher token not available for POST test');
            try {
                await createAddress(teacher1AccessToken, testAddressData);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden'); // Check data for error
            }
        });
    }); // End POST describe

    // --- Tests for GET /:id --- //
    describe('GET /:id', () => {
        let addressForGetTest: Address;

        // Create a fresh address before each test in this suite
        beforeEach(async () => {
            if (!student1AccessToken) throw new Error('Student 1 auth token not available for GET beforeEach');
            try {
                const postResponse = await createAddress(student1AccessToken, testAddressData);
                // Axios throws on non-2xx, so if we get here, it's 201
                if (!postResponse.data?.id) { // Check response.data
                    console.error('Address creation in beforeEach failed to return ID:', postResponse.data);
                    throw new Error('Failed to get address ID via POST during GET beforeEach setup.');
                }
                addressForGetTest = postResponse.data as Address; // Assign from response.data
            } catch (error) {
                console.error("Error in GET /:id beforeEach setup:", error);
                throw new Error('Failed to create address via POST during GET beforeEach setup.');
            }
        });

        it('should fetch an address by its ID successfully (200) for the owning student', async () => {
            if (!addressForGetTest?.id) throw new Error('Address or ID not created in beforeEach for GET test');

            const response = await getAddressById(student1AccessToken, addressForGetTest.id);

            expect(response.status).toBe(200);
            // expect(response.headers['content-type']).toMatch(/application\/json/);

            const address: Address = response.data; // Use response.data
            expect(address).toBeDefined();
            expect(address.id).toEqual(addressForGetTest.id);
            expect(address.street).toEqual(testAddressData.street);
            expect(address.city).toEqual(testAddressData.city);
            expect(address.state).toEqual(testAddressData.state);
            expect(address.postalCode).toEqual(testAddressData.postalCode);
            expect(address.country).toEqual(testAddressData.country);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            if (!addressForGetTest?.id) throw new Error('Address ID is missing for GET test');
            try {
                await getAddressByIdUnauthenticated(addressForGetTest.id);
                throw new Error('Request should have failed with 401');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(401);
            }
        });

        it('should return 403 Forbidden if a teacher tries to fetch', async () => {
            if (!addressForGetTest?.id) throw new Error('Address ID is missing for GET test');
            if (!teacher1AccessToken) throw new Error('Teacher token not available for GET test');
            try {
                await getAddressById(teacher1AccessToken, addressForGetTest.id);
                throw new Error('Request should have failed with 403');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(403);
                expect(error.response?.data?.error).toContain('Forbidden'); // Check data for error
            }
        });

        it('should return 404 Not Found for a non-existent address ID (valid UUID) when authenticated', async () => {
            const fakeId = uuidv4();
            try {
                await getAddressById(student1AccessToken, fakeId);
                throw new Error('Request should have failed with 404');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(404);
                expect(error.response?.data?.message).toEqual(`Address with ID ${fakeId} not found.`); // Check data for error
            }
        });

        it('should return 400 Bad Request for an invalid ID format when authenticated', async () => {
            const invalidId = 'this-is-not-a-valid-uuid';
            try {
                await getAddressById(student1AccessToken, invalidId);
                throw new Error('Request should have failed with 400');
            } catch (error: any) {
                expect(axios.isAxiosError(error)).toBe(true);
                expect(error.response?.status).toBe(400);
                expect(error.response?.data?.message).toEqual('Invalid address ID format.'); // Check data for error
            }
        });
    }); // End GET /:id describe

}); // End main describe 