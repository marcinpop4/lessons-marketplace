import { UserType as DbUserType } from '@prisma/client';
import { PasswordCredential } from '../../shared/models/PasswordCredential.js';
import { UserType } from '../../shared/models/UserType.js';

// --- Restore Temporary Placeholder for Prisma Model ---
interface DbPasswordCredential {
    id: string;
    userId: string;
    userType: DbUserType; // Use Prisma's UserType enum
    hashedPassword: string;
    createdAt: Date;
    updatedAt: Date;
}
// --- End Restore Temporary Placeholder ---

// Type assertion function for UserType (can be shared later if needed)
function assertUserType(dbType: DbUserType): UserType {
    if (dbType === UserType.STUDENT || dbType === UserType.TEACHER) {
        return dbType as UserType;
    }
    throw new Error(`Invalid UserType received from DB: ${dbType}`);
}

export class PasswordCredentialMapper {
    /**
     * Maps a Prisma PasswordCredential object (represented by temporary interface)
     * to the shared PasswordCredential domain model.
     * Performs necessary type assertions.
     *
     * @param dbCredential - The PasswordCredential object fetched from Prisma (using temp interface).
     * @returns The corresponding shared PasswordCredential domain model instance.
     * @throws Error if UserType from DB is invalid.
     */
    static toModel(dbCredential: DbPasswordCredential): PasswordCredential {
        const validatedUserType = assertUserType(dbCredential.userType);

        return new PasswordCredential({
            id: dbCredential.id,
            userId: dbCredential.userId,
            userType: validatedUserType,
            hashedPassword: dbCredential.hashedPassword,
            createdAt: dbCredential.createdAt,
            updatedAt: dbCredential.updatedAt,
        });
    }

    // static toPersistence(domainCredential: PasswordCredential) { ... }
} 