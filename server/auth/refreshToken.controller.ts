import { Request, Response, NextFunction } from 'express';
import { refreshTokenService } from './refreshToken.service.js';
import authService from './auth.service.js';
import { cookieOptions, REFRESH_TOKEN_COOKIE_NAME } from './auth.constants.js';
import { UserType } from '../../shared/models/UserType.js';

export class RefreshTokenController {
    async refreshAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 1. Get refresh token from cookie
            const refreshTokenFromCookie = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

            if (!refreshTokenFromCookie) {
                res.status(401).json({ error: 'No refresh token provided' });
                return;
            }

            // 2. Validate token using RefreshTokenService
            const storedToken = await refreshTokenService.findValidToken(refreshTokenFromCookie);

            if (!storedToken) {
                // Clear potentially invalid cookie
                res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions);
                res.status(401).json({ error: 'Invalid or expired refresh token' });
                return;
            }

            // 3. Token is valid, get user info using AuthService
            const { userId, userType } = storedToken;

            // Use authService to fetch user info instead of direct Prisma access
            const user = await authService.getUserByIdAndType(userId, userType as UserType);

            if (!user) {
                // User associated with token not found (data inconsistency?)
                // Clear potentially invalid cookie and revoke the token
                res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions);
                await refreshTokenService.revokeTokenById(storedToken.id); // Revoke the now invalid token
                res.status(401).json({ error: 'User for refresh token not found' });
                return;
            }

            // 4. Generate NEW access token using AuthService
            const accessToken = authService.generateToken({
                id: user.id,
                userType: userType as UserType, // Use userType from the validated token with cast
            });

            // 5. Return user info and new access token
            res.status(200).json({
                user: {
                    ...user,
                    userType, // Add userType to the response object
                },
                accessToken,
            });
        } catch (error) {
            console.error('Token refresh error:', error);
            // Send 500 for unexpected errors during refresh
            res.status(500).json({ error: 'Failed to refresh token' }); // Avoid leaking error details
        }
    }
}

export const refreshTokenController = new RefreshTokenController(); 