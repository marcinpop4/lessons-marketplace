import { PrismaClient, Prisma } from '@prisma/client';
// Import shared models using direct paths
import { PasswordCredential } from '../../shared/models/PasswordCredential.js';
import { UserType } from '../../shared/models/UserType.js';
import prisma from '../prisma.js';
import bcryptjs from 'bcryptjs';
import { PasswordCredentialMapper } from './password-credential.mapper.js'; // Import the mapper


// Define the type for the Prisma client or transaction client
type PrismaTransactionClient = Omit<
    PrismaClient, // Simplify: Omit from the base PrismaClient type
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * IMPORTANT: This service requires the PasswordCredential table to exist in the database.
 * Any linter errors for passwordCredential not existing WILL PERSIST until prisma generate is run.
 */
class PasswordService {
    private readonly prisma = prisma;
    private readonly saltRounds = 10;

    /**
     * Hashes a plain-text password.
     * @param password The plain-text password.
     * @returns The hashed password string.
     */
    private async hashPassword(password: string): Promise<string> {
        return bcryptjs.hash(password, this.saltRounds);
    }

    /**
     * Compares a plain-text password with a stored hash.
     * @param password The plain-text password.
     * @param hash The stored hashed password.
     * @returns True if the password matches the hash, false otherwise.
     */
    private async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcryptjs.compare(password, hash);
    }

    /**
     * Creates a new password credential record for a user.
     * Uses shared model types for input and output.
     * @param userId The ID of the Student or Teacher.
     * @param userType The type of the user (STUDENT or TEACHER) (from shared enum).
     * @param plainPassword The plain-text password to hash and store.
     * @param client Optional Prisma client (transactional or default).
     * @returns The created PasswordCredential object as a shared model.
     */
    async createPasswordCredential(
        userId: string,
        userType: UserType, // Use shared UserType
        plainPassword: string,
        client: PrismaTransactionClient | PrismaClient = this.prisma
    ): Promise<PasswordCredential> { // Return shared model
        const hashedPassword = await this.hashPassword(plainPassword);
        try {
            // Use the provided client (tx or default prisma)
            // Type errors on 'passwordCredential' are expected until prisma generate is run.
            const dbCredential = await client.passwordCredential.create({
                data: {
                    userId,
                    userType, // Pass shared enum value directly
                    hashedPassword,
                },
            });
            // Map the result from Prisma to the shared model
            return PasswordCredentialMapper.toModel(dbCredential);
        } catch (error) {
            // Handle potential unique constraint errors if needed
            console.error(`Error creating password credential for ${userType} ${userId}:`, error);
            throw new Error('Failed to create password credential.');
        }
    }

    /**
     * Finds a password credential record for a specific user.
     * Uses shared model types for input and output.
     * @param userId The ID of the Student or Teacher.
     * @param userType The type of the user (from shared enum).
     * @param client Optional Prisma client (transactional or default).
     * @returns The PasswordCredential object as a shared model or null if not found.
     */
    async findCredential(
        userId: string,
        userType: UserType, // Use shared UserType
        client: PrismaTransactionClient | PrismaClient = this.prisma
    ): Promise<PasswordCredential | null> { // Return shared model or null
        // Use the provided client (tx or default prisma)
        // Type errors on 'passwordCredential' are expected until prisma generate is run.
        const dbCredential = await client.passwordCredential.findUnique({
            where: {
                userId_userType: { userId, userType }, // Pass shared enum value directly
            },
        });

        if (!dbCredential) {
            return null;
        }
        // Map the result from Prisma to the shared model
        return PasswordCredentialMapper.toModel(dbCredential);
    }

    /**
     * Verifies a plain-text password against the stored credential for a user.
     * Uses shared model types for input.
     * @param userId The ID of the Student or Teacher.
     * @param userType The type of the user (from shared enum).
     * @param plainPassword The plain-text password to verify.
     * @param client Optional Prisma client (transactional or default).
     * @returns True if the password is valid, false otherwise.
     */
    async verifyPassword(
        userId: string,
        userType: UserType, // Use shared UserType
        plainPassword: string,
        client: PrismaTransactionClient | PrismaClient = this.prisma
    ): Promise<boolean> {
        // Use the provided client (tx or default prisma)
        const credential = await this.findCredential(userId, userType, client); // Already returns shared model or null
        if (!credential) {
            return false; // No credential found for this user
        }
        // Compare using the hashedPassword from the shared model
        return this.comparePassword(plainPassword, credential.hashedPassword);
    }
}

export const passwordService = new PasswordService();