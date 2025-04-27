import { UserType } from './UserType.js';
import { AuthMethodType } from './AuthMethodType.js';

/**
 * Properties required to create a UserAuthMethod instance.
 */
export interface UserAuthMethodProps {
    id: string;
    userId: string;
    userType: UserType;
    method: AuthMethodType;
    isActive: boolean;
    createdAt?: Date; // Optional, often set by DB
    updatedAt?: Date; // Optional, often set by DB
}

/**
 * @openapi
 * components:
 *   schemas:
 *     UserAuthMethod:
 *       type: object
 *       description: Represents an authentication method linked to a user.
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the auth method record.
 *         userId:
 *           type: string
 *           description: ID of the user (Student or Teacher) this method belongs to.
 *         userType:
 *           $ref: '#/components/schemas/UserType' # Assuming UserType schema exists
 *         method:
 *           $ref: '#/components/schemas/AuthMethodType'
 *         isActive:
 *           type: boolean
 *           description: Whether this authentication method is currently active.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the auth method was linked.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the auth method was last updated.
 *       required:
 *         - id
 *         - userId
 *         - userType
 *         - method
 *         - isActive
 *         - createdAt
 *         - updatedAt
 */
export class UserAuthMethod {
    id: string;
    userId: string;
    userType: UserType;
    method: AuthMethodType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor({
        id,
        userId,
        userType,
        method,
        isActive,
        createdAt = new Date(), // Default to now if not provided
        updatedAt = new Date()  // Default to now if not provided
    }: UserAuthMethodProps) {
        this.id = id;
        this.userId = userId;
        this.userType = userType;
        this.method = method;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
} 