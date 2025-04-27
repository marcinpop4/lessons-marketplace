import { UserType } from '../models/UserType.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     LoginUserDTO:
 *       type: object
 *       description: Data Transfer Object for user login.
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email address.
 *           example: ethan.parker@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: The user's password.
 *           writeOnly: true # Mark password as writeOnly for security
 *           example: yourSecurePassword123
 *         userType:
 *           $ref: '#/components/schemas/UserType'
 *           description: The type of user logging in (STUDENT or TEACHER).
 *           example: STUDENT
 *       required:
 *         - email
 *         - password
 *         - userType
 *       example:
 *         email: ethan.parker@example.com
 *         password: 1234
 *         userType: STUDENT
 */
export interface LoginUserDTO {
    email: string;
    password: string;
    userType: UserType;
} 