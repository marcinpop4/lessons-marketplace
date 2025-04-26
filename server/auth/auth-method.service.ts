import { PrismaClient, Prisma } from '@prisma/client';
// Import shared models using direct paths
import { UserAuthMethod } from '../../shared/models/UserAuthMethod.js';
import { AuthMethodType } from '../../shared/models/AuthMethodType.js';
import { UserType } from '../../shared/models/UserType.js';
import prisma from '../prisma.js';
import { AuthMethodMapper } from './auth-method.mapper.js'; // Import the mapper

// Define the type for the Prisma client or transaction client
type PrismaTransactionClient = Prisma.TransactionClient;

// Define DTO for creating auth methods
export interface UserAuthMethodDTO {
    userId: string;
    userType: UserType;
    method: AuthMethodType;
}

class AuthMethodService {
    private readonly prisma = prisma;

    /**
     * Add an authentication method for a user or update it if it exists.
     * Uses shared model types for input and output.
     * @param authMethodDTO DTO containing user ID, user type, and auth method
     * @param client Optional Prisma transaction client
     * @returns Created or updated auth method record as a shared model.
     */
    async addAuthMethod(
        authMethodDTO: UserAuthMethodDTO,
        client: PrismaTransactionClient | PrismaClient = this.prisma
    ): Promise<UserAuthMethod> { // Return shared model
        const { userId, userType, method } = authMethodDTO;

        // This code assumes the migration has been run and the schema updated
        // Type errors on 'userAuthMethod' are expected until prisma generate is run.
        const dbAuthMethod = await client.userAuthMethod.upsert({
            where: {
                userId_userType_method: {
                    userId,
                    userType,
                    method // Pass shared enum value directly
                }
            },
            update: {
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                userId,
                userType,
                method, // Pass shared enum value directly
                isActive: true
            }
        });
        // Map the result from Prisma (even if type is incorrect now) to the shared model
        return AuthMethodMapper.toModel(dbAuthMethod);
    }

    /**
     * Get active authentication methods for a user.
     * Returns shared model types.
     * @param userId User ID
     * @param userType Type of user (STUDENT or TEACHER)
     * @returns Array of active authentication method shared models.
     */
    async getActiveAuthMethods(userId: string, userType: UserType): Promise<UserAuthMethod[]> { // Return array of shared models
        // Type errors on 'userAuthMethod' are expected until prisma generate is run.
        const dbAuthMethods = await this.prisma.userAuthMethod.findMany({
            where: {
                userId,
                userType, // Use shared UserType
                isActive: true
            }
            // No select needed, fetch the whole object for mapping
        });

        // Map the array of Prisma results to shared models
        return dbAuthMethods.map((dbAuthMethod: any) => AuthMethodMapper.toModel(dbAuthMethod));
    }

    /**
     * Check if a user has a specific active authentication method.
     * Uses shared model types for input.
     * @param userId User ID
     * @param userType Type of user (STUDENT or TEACHER)
     * @param method Authentication method to check (from shared enum)
     * @returns Boolean indicating if the method is active
     */
    async hasAuthMethod(userId: string, userType: UserType, method: AuthMethodType): Promise<boolean> { // Use shared types
        // Type errors on 'userAuthMethod' are expected until prisma generate is run.
        const count = await this.prisma.userAuthMethod.count({
            where: {
                userId,
                userType,
                method,
                isActive: true
            }
        });

        return count > 0;
    }

    /**
     * Deactivate an authentication method for a user.
     * Uses shared model types for input and output.
     * @param authMethodDTO DTO containing user ID, user type, and auth method
     * @param client Optional Prisma transaction client
     * @returns Updated auth method record as a shared model.
     */
    async deactivateAuthMethod(
        authMethodDTO: UserAuthMethodDTO,
        client: PrismaTransactionClient | PrismaClient = this.prisma
    ): Promise<UserAuthMethod> { // Return shared model
        const { userId, userType, method } = authMethodDTO;

        // Type errors on 'userAuthMethod' are expected until prisma generate is run.
        const dbAuthMethod = await client.userAuthMethod.update({
            where: {
                userId_userType_method: {
                    userId,
                    userType,
                    method
                }
            },
            data: {
                isActive: false
            }
        });
        // Map the result from Prisma (even if type is incorrect now) to the shared model
        return AuthMethodMapper.toModel(dbAuthMethod);
    }
}

// Export singleton instance
export const authMethodService = new AuthMethodService(); 