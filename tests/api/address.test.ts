import request from 'supertest';
import { Address } from '@shared/models/Address'; // Shared model for response structure
// import { LessonType } from '@prisma/client'; // No longer needed for setup
import { v4 as uuidv4 } from 'uuid'; // For generating fake IDs

// Seeded user credentials (needed for auth token)
const SEEDED_STUDENT_EMAIL = 'ethan.parker@example.com'; // From seed.js
const SEEDED_PASSWORD = '1234'; // From seed.js

// API Base URL from environment variables (set up by jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

describe('API Integration: /api/v1/addresses', () => {
    let createdAddressIdForGetTest: string | null = null;
    let studentAuthToken: string | null = null; // Auth token for authenticated requests

    // Test data for POST requests
    const testAddressData = {
        street: '123 API Test St',
        city: 'Postville',
        state: 'PV',
        postalCode: '11223',
        country: 'Postland'
    };

    // Setup: Login as student to get auth token
    beforeAll(async () => {
        try {
            const loginResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: SEEDED_STUDENT_EMAIL, password: SEEDED_PASSWORD, userType: 'STUDENT' });

            if (loginResponse.status !== 200 || !loginResponse.body.accessToken) {
                throw new Error(`Failed to log in as student ${SEEDED_STUDENT_EMAIL}: ${loginResponse.body.error || 'Login endpoint failed'}`);
            }
            studentAuthToken = `Bearer ${loginResponse.body.accessToken}`;

            // Create an address specifically for the GET tests using the new POST endpoint
            const postResponse = await request(API_BASE_URL!)
                .post('/api/v1/addresses')
                .set('Authorization', studentAuthToken)
                .send(testAddressData);

            if (postResponse.status !== 201 || !postResponse.body.id) {
                throw new Error('Failed to create address via POST during test setup.');
            }
            createdAddressIdForGetTest = postResponse.body.id;

        } catch (error) {
            throw error; // Fail fast if setup fails
        }
    }, 30000); // Reduced timeout slightly as it's just login + 1 request

    // --- Tests for POST / --- //
    describe('POST /', () => {
        it('should create a new address successfully (201)', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');

            const response = await request(API_BASE_URL!)
                .post('/api/v1/addresses')
                .set('Authorization', studentAuthToken)
                .send(testAddressData);

            expect(response.status).toBe(201);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const createdAddress: Address = response.body;
            expect(createdAddress).toBeDefined();
            expect(createdAddress.id).toBeDefined(); // Should have a generated ID
            expect(createdAddress.street).toEqual(testAddressData.street);
            expect(createdAddress.city).toEqual(testAddressData.city);
            expect(createdAddress.state).toEqual(testAddressData.state);
            expect(createdAddress.postalCode).toEqual(testAddressData.postalCode);
            expect(createdAddress.country).toEqual(testAddressData.country);
            // Timestamps should exist
            expect(createdAddress.createdAt).toBeDefined();
            expect(createdAddress.updatedAt).toBeDefined();
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await request(API_BASE_URL!)
                .post('/api/v1/addresses')
                .send(testAddressData); // No Authorization header

            expect(response.status).toBe(401);
        });

        it('should return 400 Bad Request if required fields are missing (e.g., city)', async () => {
            if (!studentAuthToken) throw new Error('Auth token not available');

            const incompleteData = { ...testAddressData };
            delete (incompleteData as any).city; // Remove city

            const response = await request(API_BASE_URL!)
                .post('/api/v1/addresses')
                .set('Authorization', studentAuthToken)
                .send(incompleteData);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Missing required address fields');
        });

        // Add more tests for other missing fields if desired
    });

    // --- Tests for GET /:id --- //
    describe('GET /:id', () => {
        it('should fetch an address by its ID successfully (200)', async () => {
            if (!createdAddressIdForGetTest) throw new Error('Address ID not created in setup for GET test');

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/addresses/${createdAddressIdForGetTest}`); // Still doesn't require auth based on route definition

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            const address: Address = response.body;
            expect(address).toBeDefined();
            expect(address.id).toEqual(createdAddressIdForGetTest);
            expect(address.street).toEqual(testAddressData.street); // Check against data used in setup POST
            expect(address.city).toEqual(testAddressData.city);
            expect(address.state).toEqual(testAddressData.state);
            expect(address.postalCode).toEqual(testAddressData.postalCode);
            expect(address.country).toEqual(testAddressData.country);
        });

        // Keep existing 404 tests
        it('should return 404 Not Found for a non-existent address ID (valid UUID)', async () => {
            const fakeId = uuidv4();
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/addresses/${fakeId}`);
            expect(response.status).toBe(404);
            expect(response.body.message).toContain(`Address with ID ${fakeId} not found`);
        });

        it('should return 404 Not Found for an invalid ID format', async () => {
            const invalidId = 'this-is-not-a-valid-uuid';
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/addresses/${invalidId}`);
            expect(response.status).toBe(404);
            expect(response.body.message).toContain(`Address with ID ${invalidId} not found`);
        });

        // GET /:id still doesn't require auth
    });
}); 