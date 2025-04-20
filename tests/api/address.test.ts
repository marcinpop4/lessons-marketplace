import request from 'supertest';
import { Address } from '@shared/models/Address'; // Shared model for response structure
import { LessonType } from '@prisma/client'; // Enum needed for creating lesson request payload
import { v4 as uuidv4 } from 'uuid'; // For generating fake IDs

// Seeded user credentials (needed to create the resource that gives us an address ID)
const SEEDED_STUDENT_EMAIL = 'ethan.parker@example.com'; // From seed.js
const SEEDED_PASSWORD = '1234'; // From seed.js

// API Base URL from environment variables (set up by jest.setup.api.ts)
const API_BASE_URL = process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
    throw new Error('Missing required environment variable: VITE_API_BASE_URL. Ensure .env.api-test is loaded correctly.');
}

describe('API Integration: /api/v1/addresses', () => {
    let createdAddressId: string | null = null;
    let studentAuthToken: string | null = null; // Needed ONLY to create the lesson request in setup

    // Setup: Login and create a lesson request to get a valid address ID to test against
    beforeAll(async () => {
        try {
            // 1. Login as student
            const loginResponse = await request(API_BASE_URL!)
                .post('/api/v1/auth/login')
                .send({ email: SEEDED_STUDENT_EMAIL, password: SEEDED_PASSWORD, userType: 'STUDENT' });

            if (loginResponse.status !== 200 || !loginResponse.body.accessToken || !loginResponse.body.user?.id) {
                throw new Error(`Failed to log in as student ${SEEDED_STUDENT_EMAIL}: ${loginResponse.body.error || 'Login endpoint failed'}`);
            }
            studentAuthToken = `Bearer ${loginResponse.body.accessToken}`;
            const studentId = loginResponse.body.user.id;

            // 2. Create a lesson request (which includes creating an address)
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5); // Arbitrary future date
            futureDate.setHours(10, 0, 0, 0); // 10 AM
            const lessonRequestData = {
                studentId: studentId,
                addressObj: { street: '1 Test Addr St', city: 'AddrTest', state: 'AT', postalCode: '98765', country: 'Testland' },
                type: LessonType.BASS, // Example type
                startTime: futureDate.toISOString(),
                durationMinutes: 60
            };

            const createResponse = await request(API_BASE_URL!)
                .post('/api/v1/lesson-requests')
                .set('Authorization', studentAuthToken) // Auth needed to create request
                .send(lessonRequestData);

            if (createResponse.status !== 201 || !createResponse.body.lessonRequest?.address?.id) {
                throw new Error('Failed to create lesson request or extract address ID during test setup.');
            }

            createdAddressId = createResponse.body.lessonRequest.address.id;

        } catch (error) {
            throw error; // Fail fast if setup fails
        }
    }, 45000); // Increased timeout for login + resource creation

    describe('GET /:id', () => {
        it('should fetch an address by its ID successfully (200)', async () => {
            if (!createdAddressId) throw new Error('Address ID not created in setup');

            const response = await request(API_BASE_URL!)
                .get(`/api/v1/addresses/${createdAddressId}`); // No Auth token needed here based on routes definition

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);

            // Validate response using shared Address model structure
            const address: Address = response.body;
            expect(address).toBeDefined();
            expect(address.id).toEqual(createdAddressId);
            expect(address.street).toEqual('1 Test Addr St'); // Check against data used in setup
            expect(address.city).toEqual('AddrTest');
            expect(address.state).toEqual('AT');
            expect(address.postalCode).toEqual('98765');
            expect(address.country).toEqual('Testland');
        });

        it('should return 404 Not Found for a non-existent address ID (valid UUID)', async () => {
            const fakeId = uuidv4(); // Generate a valid UUID that doesn't exist in the DB
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/addresses/${fakeId}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toContain(`Address with ID ${fakeId} not found`);
        });

        it('should return 404 Not Found for an invalid ID format', async () => {
            const invalidId = 'this-is-not-a-valid-uuid';
            const response = await request(API_BASE_URL!)
                .get(`/api/v1/addresses/${invalidId}`);

            // The controller's findUnique likely returns null for an invalid ID format,
            // triggering the standard 404 "not found" response.
            expect(response.status).toBe(404);
            expect(response.body.message).toContain(`Address with ID ${invalidId} not found`);
        });

        // Note: A 401 Unauthorized test is omitted here because the
        // specific route definition for GET /api/v1/addresses/:id
        // doesn't show authentication middleware being applied directly.
        // If global auth is added later, this test might be needed.
    });
}); 