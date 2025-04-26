// server/auth/refreshToken.service.ts
import prisma from '../prisma.js';
import crypto from 'crypto';
import { UserType as PrismaUserType } from '@prisma/client';
import { UserType } from '../../shared/models/UserType.js';

const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

export class RefreshTokenService {
    /**
     * Creates a new refresh token for a user.
     * @param userId - The ID of the user.
     * @param userType - The type of the user (STUDENT or TEACHER).
     * @returns The generated unique refresh token string.
     */
    async createRefreshToken(userId: string, userType: UserType): Promise<string> {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);

        const uniqueRefreshToken = crypto.randomBytes(32).toString('hex');

        await prisma.refreshToken.create({
            data: {
                token: uniqueRefreshToken,
                userId: userId,
                userType: userType,
                expiresAt,
            },
        });

        return uniqueRefreshToken;
    }

    /**
     * Finds and validates a refresh token.
     * @param token - The refresh token string to validate.
     * @returns The stored token object if valid and found, otherwise null.
     */
    async findValidToken(token: string): Promise<{ userId: string; userType: PrismaUserType; id: string } | null> {
        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                token: token,
                revokedAt: null,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                userId: true,
                userType: true,
            }
        });

        return storedToken;
    }

    /**
     * Deletes refresh tokens associated with a given token string.
     * Typically used during logout.
     * @param token - The refresh token string to delete.
     * @returns A promise that resolves when the operation is complete.
     */
    async deleteToken(token: string): Promise<void> {
        await prisma.refreshToken.deleteMany({
            where: { token: token },
        });
    }

    /**
     * Revokes a refresh token by setting its revokedAt timestamp.
     * @param tokenId - The ID of the refresh token record in the DB.
     * @returns A promise that resolves when the operation is complete.
     */
    async revokeTokenById(tokenId: string): Promise<void> {
        await prisma.refreshToken.update({
            where: { id: tokenId },
            data: { revokedAt: new Date() },
        });
    }
}

export const refreshTokenService = new RefreshTokenService(); 