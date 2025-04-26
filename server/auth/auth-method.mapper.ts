import { UserType as DbUserType } from '@prisma/client'; // Only import UserType enum
import { UserAuthMethod } from '../../shared/models/UserAuthMethod.js';
import { AuthMethodType } from '../../shared/models/AuthMethodType.js';
import { UserType } from '../../shared/models/UserType.js';

// --- Restore Temporary Placeholder for Prisma Model ---
interface DbUserAuthMethod {
    id: string;
    userId: string;
    userType: DbUserType; // Use Prisma's UserType enum
    method: string;       // Assuming Prisma stores the method as a string enum value
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
// --- End Restore Temporary Placeholder ---

// Type assertion function for UserType
function assertUserType(dbType: DbUserType): UserType {
    if (dbType === UserType.STUDENT || dbType === UserType.TEACHER) {
        return dbType as UserType;
    }
    throw new Error(`Invalid UserType received from DB: ${dbType}`);
}

// Type assertion function for AuthMethodType
// Validate the string from the temporary interface against the shared enum
function assertAuthMethodType(dbMethod: string): AuthMethodType {
    const sharedMethod = dbMethod as AuthMethodType;
    if (Object.values(AuthMethodType).includes(sharedMethod)) {
        return sharedMethod;
    }
    throw new Error(`Invalid AuthMethodType received from DB: ${dbMethod}`);
}

export class AuthMethodMapper {
    /**
     * Maps a Prisma UserAuthMethod object (represented by temporary interface) 
     * to the shared UserAuthMethod domain model.
     * Performs necessary type assertions.
     *
     * @param dbAuthMethod - The UserAuthMethod object fetched from Prisma (using temp interface).
     * @returns The corresponding shared UserAuthMethod domain model instance.
     * @throws Error if UserType or AuthMethodType from DB is invalid.
     */
    static toModel(dbAuthMethod: DbUserAuthMethod): UserAuthMethod { // Use temp interface
        const validatedUserType = assertUserType(dbAuthMethod.userType);
        const validatedMethodType = assertAuthMethodType(dbAuthMethod.method);

        return new UserAuthMethod({
            id: dbAuthMethod.id,
            userId: dbAuthMethod.userId,
            userType: validatedUserType,
            method: validatedMethodType,
            isActive: dbAuthMethod.isActive,
            createdAt: dbAuthMethod.createdAt,
            updatedAt: dbAuthMethod.updatedAt,
        });
    }

    // static toPersistence(...) { ... }
} 