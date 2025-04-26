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
 * Represents the shared data model for a user's authentication method.
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