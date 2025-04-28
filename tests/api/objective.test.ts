import request from 'supertest';
import { Student } from '@shared/models/Student';
import { Objective } from '@shared/models/Objective';
import { LessonType } from '@shared/models/LessonType';
import { ObjectiveStatusValue } from '@shared/models/ObjectiveStatus';
import { UserType } from '@shared/models/UserType';
// Import user utils
import { createTestStudent, createTestTeacher, loginTestUser } from './utils/user.utils';
// Import objective utils
import {
    createObjective,
    createObjectiveUnauthenticated,
    getObjectives,
    getObjectivesUnauthenticated,
    updateObjectiveStatus,
    updateObjectiveStatusUnauthenticated,
    patchObjectiveRaw,
    CreateObjectivePayload // Import payload type
} from './utils/objective.utils';

// Keep API_BASE_URL - needed for some direct calls if necessary (though maybe not here)
const API_BASE_URL = process.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
    throw new Error('[API Test Setup] Missing required environment variable: VITE_API_BASE_URL.');
}

// Main describe block
describe('API Integration: Objectives - /api/v1/objectives', () => {
    // Users/Tokens created once for general use across POST/PATCH error cases
    let testStudent1: Student;
    let student1Password: string;
    let student1AccessToken: string;

    let testStudent2: Student;
    let student2Password: string;
    let student2AccessToken: string;

    let testTeacher: any;
    let teacherAccessToken: string;

    // Setup remains the same
    // REMOVED: Objective created in main beforeAll is no longer needed here
    // let createdObjectiveForStudent1: Objective; 

    // Shared setup: Create common users needed for various tests
    beforeAll(async () => {
        // Create/login Student 1 (used primarily for POST/PATCH error checks now)
        const { user: s1User, password: s1Password } = await createTestStudent();
        testStudent1 = s1User;
        student1Password = s1Password;
        student1AccessToken = await loginTestUser(testStudent1.email, student1Password, UserType.STUDENT);

        // Create/login Student 2 (used for GET empty list check)
        const { user: s2User, password: s2Password } = await createTestStudent();
        testStudent2 = s2User;
        student2Password = s2Password;
        student2AccessToken = await loginTestUser(testStudent2.email, student2Password, UserType.STUDENT);

        // Create/login Teacher (used for POST/PATCH forbidden checks)
        const { user: teacherUser, password: tPassword } = await createTestTeacher();
        testTeacher = teacherUser;
        teacherAccessToken = await loginTestUser(testTeacher.email, tPassword, UserType.TEACHER);
    });

    // Test suite for POST endpoint
    describe('POST /api/v1/objectives', () => {
        let objectiveData: CreateObjectivePayload;

        beforeEach(() => {
            // Reset payload before each POST test
            objectiveData = {
                title: 'POST Test Objective',
                description: 'This objective should be created via POST test.',
                lessonType: LessonType.GUITAR,
                targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
        });

        it('should create a new objective for an authenticated student (201)', async () => {
            const response = await createObjective(student1AccessToken, objectiveData);
            expect(response.status).toBe(201);
            const createdObjective: Objective = response.body;
            expect(createdObjective.studentId).toEqual(testStudent1.id);
            expect(createdObjective.title).toEqual(objectiveData.title);
            expect(createdObjective.currentStatus.status).toEqual(ObjectiveStatusValue.CREATED);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await createObjectiveUnauthenticated(objectiveData);
            expect(response.status).toBe(401);
        });

        it('should return 400 Bad Request if title is missing', async () => {
            const { title, ...invalidData } = objectiveData;
            const response = await createObjective(student1AccessToken, invalidData as any);
            expect(response.status).toBe(400);
        });

        it('should return 400 Bad Request if lessonType is invalid', async () => {
            const invalidData = { ...objectiveData, lessonType: 'INVALID' as any };
            const response = await createObjective(student1AccessToken, invalidData);
            expect(response.status).toBe(400);
        });

        it('should return 400 Bad Request if targetDate format is invalid', async () => {
            const invalidData = { ...objectiveData, targetDate: 'not-a-date' };
            const response = await createObjective(student1AccessToken, invalidData);
            expect(response.status).toBe(400);
        });

        it('should return 400 Bad Request if targetDate is in the past', async () => {
            const invalidData = { ...objectiveData, targetDate: new Date(Date.now() - 86400000).toISOString() };
            const response = await createObjective(student1AccessToken, invalidData);
            expect(response.status).toBe(400);
        });
    }); // End POST describe

    // Test suite for GET endpoint - Independent Setup
    describe('GET /api/v1/objectives', () => {
        let getTestStudent: Student;
        let getTestStudentToken: string;
        let getTestObjective: Objective;

        // Setup specific to GET tests
        beforeAll(async () => {
            const { user: student, password } = await createTestStudent();
            getTestStudent = student;
            getTestStudentToken = await loginTestUser(getTestStudent.email, password, UserType.STUDENT);

            const objectiveData: CreateObjectivePayload = {
                title: 'GET Test Specific Objective',
                description: 'Created only for GET tests.',
                lessonType: LessonType.BASS,
                targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
            };
            const createResponse = await createObjective(getTestStudentToken, objectiveData);
            if (createResponse.status !== 201) {
                throw new Error('Failed to create prerequisite objective for GET tests');
            }
            getTestObjective = createResponse.body;
        });

        it('should return return all objectives for the passed in studentId', async () => {
            const response = await getObjectives(getTestStudentToken, getTestStudent.id);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);

            const objectives: Objective[] = response.body;
            expect(objectives).toHaveLength(1);
            expect(objectives[0].id).toEqual(getTestObjective.id);
            expect(objectives[0].title).toEqual(getTestObjective.title);
            expect(objectives[0].studentId).toEqual(getTestStudent.id);
            objectives.forEach(obj => {
                expect(obj.studentId).not.toEqual(testStudent1.id);
                expect(obj.studentId).not.toEqual(testStudent2.id);
            });
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await getObjectivesUnauthenticated();
            expect(response.status).toBe(401);
        });
    }); // End GET describe

    // Test suite for PATCH endpoint
    describe('PATCH /api/v1/objectives/:objectiveId', () => {

        let patchTestObjective: Objective;

        beforeEach(async () => {
            const objectiveData: CreateObjectivePayload = {
                title: `PATCH Test Objective - ${Date.now()}`,
                description: 'This is created fresh before each PATCH test.',
                lessonType: LessonType.VOICE,
                targetDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
            };
            const response = await createObjective(student1AccessToken, objectiveData);
            if (response.status !== 201) {
                throw new Error('Failed to create objective in PATCH beforeEach');
            }
            patchTestObjective = response.body;
            expect(patchTestObjective.currentStatus.status).toEqual(ObjectiveStatusValue.CREATED);
        });

        it('should update the status to ACHIEVED for an objective owned by the student', async () => {
            const response = await updateObjectiveStatus(student1AccessToken, patchTestObjective.id, {
                status: ObjectiveStatusValue.ACHIEVED
            });
            expect(response.status).toBe(200);
            const updatedObjective: Objective = response.body;
            expect(updatedObjective.id).toEqual(patchTestObjective.id);
            expect(updatedObjective.currentStatus.status).toEqual(ObjectiveStatusValue.ACHIEVED);
        });

        it('should update the status to ABANDONED for an objective owned by the student', async () => {
            const response = await updateObjectiveStatus(student1AccessToken, patchTestObjective.id, {
                status: ObjectiveStatusValue.ABANDONED
            });
            expect(response.status).toBe(200);
            const updatedObjective: Objective = response.body;
            expect(updatedObjective.id).toEqual(patchTestObjective.id);
            expect(updatedObjective.currentStatus.status).toEqual(ObjectiveStatusValue.ABANDONED);
        });

        it('should return 400 Bad Request for an invalid status transition (e.g., ACHIEVED to CREATED)', async () => {
            const achieveResponse = await updateObjectiveStatus(student1AccessToken, patchTestObjective.id, {
                status: ObjectiveStatusValue.ACHIEVED
            });
            expect(achieveResponse.status).toBe(200);
            expect(achieveResponse.body.currentStatus.status).toEqual(ObjectiveStatusValue.ACHIEVED);

            const invalidResponse = await updateObjectiveStatus(student1AccessToken, patchTestObjective.id, {
                status: ObjectiveStatusValue.CREATED
            });
            expect(invalidResponse.status).toBe(400);
            expect(invalidResponse.body.error).toMatch(/invalid status transition|transition from ACHIEVED to CREATED is not defined/i);
        });

        it('should return 400 Bad Request for an invalid status value', async () => {
            const response = await patchObjectiveRaw(student1AccessToken, patchTestObjective.id, {
                status: 'INVALID_STATUS_VALUE'
            });
            expect(response.status).toBe(400);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const response = await updateObjectiveStatusUnauthenticated(patchTestObjective.id, {
                status: ObjectiveStatusValue.ABANDONED
            });
            expect(response.status).toBe(401);
        });

        it('should return 404 Not Found for a non-existent objective ID', async () => {
            const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
            const response = await updateObjectiveStatus(student1AccessToken, nonExistentId, {
                status: ObjectiveStatusValue.ABANDONED
            });
            expect(response.status).toBe(404);
        });
    }); // End PATCH describe
}); // End main describe 