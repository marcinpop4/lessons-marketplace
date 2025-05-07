import { UserType } from '@shared/models/UserType.js';

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
 *           description: User's email address.
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           description: User's password.
 *           example: Pa$$w0rd!
 *         userType:
 *           $ref: '#/components/schemas/UserType'
 *           description: Specify whether logging in as STUDENT or TEACHER.
 *       required:
 *         - email
 *         - password
 *         - userType
 */
export interface LoginUserDTO {
    email: string;
    password: string;
    userType: UserType;
} 