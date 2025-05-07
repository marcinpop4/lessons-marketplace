import { UserType } from '@shared/models/UserType.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     RegisterUserDTO:
 *       type: object
 *       description: Data Transfer Object for user registration.
 *       properties:
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john.doe@example.com
 *         password:
 *           type: string
 *           format: password # Consider minLength, pattern for complexity if desired
 *           example: Str0ngP@ssw0rd!
 *         phoneNumber:
 *           type: string
 *           example: '555-123-4567'
 *         dateOfBirth:
 *           type: string
 *           format: date # ISO8601 date YYYY-MM-DD
 *           example: '1990-01-15'
 *         userType:
 *           $ref: '#/components/schemas/UserType'
 *       required:
 *         - firstName
 *         - lastName
 *         - email
 *         - password
 *         - phoneNumber
 *         - dateOfBirth
 *         - userType
 */
export interface RegisterUserDTO {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string;
    dateOfBirth: string; // Consider using Date type internally, string for DTO
    userType: UserType;
} 