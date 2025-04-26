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
 * Represents the shared data model for a user's password credential.
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