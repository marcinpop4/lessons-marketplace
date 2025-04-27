import { UserType } from './UserType.js';

/**
 * Properties required to create a PasswordCredential instance.
 */
export interface PasswordCredentialProps {
    id: string;
    userId: string;
    userType: UserType;
    hashedPassword: string;
    createdAt?: Date; // Optional, often set by DB
    updatedAt?: Date; // Optional, often set by DB
}

/**
 * @openapi
 * components:
 *   schemas:
 *     PasswordCredential:
 *       type: object
 *       description: Represents a user's password credential (sensitive data, hash only).
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier for the credential.
 *         userId:
 *           type: string
 *           description: ID of the user associated with this credential.
 *         userType:
 *           $ref: '#/components/schemas/UserType' # Assuming UserType schema exists
 *         hashedPassword:
 *           type: string
 *           description: The securely hashed password (never expose plaintext).
 *           readOnly: true # Usually not sent in responses
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the credential was created.
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the credential was last updated.
 *       required:
 *         - id
 *         - userId
 *         - userType
 *         - hashedPassword
 *         - createdAt
 *         - updatedAt
 */
export class PasswordCredential {
    id: string;
    userId: string;
    userType: UserType;
    hashedPassword: string;
    createdAt: Date;
    updatedAt: Date;

    constructor({
        id,
        userId,
        userType,
        hashedPassword,
        createdAt = new Date(), // Default to now if not provided
        updatedAt = new Date()  // Default to now if not provided
    }: PasswordCredentialProps) {
        this.id = id;
        this.userId = userId;
        this.userType = userType;
        this.hashedPassword = hashedPassword;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
} 