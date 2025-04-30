// server/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import authService, { AuthMethod } from './auth.service.js';
import { refreshTokenService } from './refreshToken.service.js';
import { cookieOptions, REFRESH_TOKEN_COOKIE_NAME } from './auth.constants.js';
import { UserType } from '../../shared/models/UserType.js';
import { LoginUserDTO } from '../../shared/dtos/LoginUser.dto.js';
import { AppError, DuplicateEmailError } from '../errors/index.js';

export class AuthController {

    // POST /register
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password, firstName, lastName, phoneNumber, dateOfBirth, userType } = req.body;

            // 1. Basic Input Validation
            if (!email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !userType) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            if (userType !== 'STUDENT' && userType !== 'TEACHER') {
                res.status(400).json({ error: 'Invalid userType' });
                return;
            }

            // 2. Call AuthService register with the new structure
            const registrationData = {
                email,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth: new Date(dateOfBirth),
                userType: userType as UserType,
                auth: {
                    method: 'PASSWORD' as AuthMethod,
                    password
                }
            };

            const { user, accessToken, uniqueRefreshToken } = await authService.register(registrationData);

            // 3. Response
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, uniqueRefreshToken, cookieOptions); // Set cookie with token from provider
            res.status(201).json({ user, accessToken }); // Return user and access token from provider

        } catch (error: unknown) {
            console.error('Registration controller caught error:', error);

            // Check for our specific custom errors first
            if (error instanceof DuplicateEmailError) {
                res.status(error.status).json({ error: error.message });
                return;
            }
            // Handle other operational AppErrors (like validation errors if they existed)
            if (error instanceof AppError && error.isOperational) {
                res.status(error.status).json({ error: error.message });
                return;
            }

            // Handle generic errors or non-operational AppErrors as 500
            if (!res.headersSent) {
                const errorMessage = error instanceof Error ? error.message : 'Registration failed due to an unexpected error.';
                res.status(500).json({ error: errorMessage });
            }
        }
    }

    // POST /login
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Use the DTO for validation/typing
            const { email, password, userType }: LoginUserDTO = req.body;

            // 1. Basic Input Validation (already present, but good to keep)
            if (!email || !password || !userType) {
                res.status(400).json({ error: 'Email, password, and userType are required' });
                return;
            }

            // Check userType using the imported enum
            if (userType !== UserType.STUDENT && userType !== UserType.TEACHER) {
                res.status(400).json({ error: 'Invalid userType' });
                return;
            }

            // 2. Call AuthService authenticate
            // Pass the validated DTO object structure
            const credentials: LoginUserDTO = { email, password, userType };
            const { user, accessToken, uniqueRefreshToken } = await authService.authenticate(credentials);

            // 3. Response
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, uniqueRefreshToken, cookieOptions); // Set cookie with token from provider
            res.status(200).json({ user, accessToken }); // Return user and access token from provider

        } catch (error: any) {
            console.error('Login controller error:', error);
            // Handle specific errors from service/provider (e.g., invalid credentials)
            if (error.message?.includes('credentials') || error.message?.includes('password') || error.message?.includes('User not found')) {
                res.status(401).json({ error: 'Invalid credentials' }); // Generic error to client
            } else if (error.message?.includes('not set up') || error.message?.includes('not enabled')) {
                res.status(401).json({ error: error.message }); // More specific internal setup errors
            } else if (!res.headersSent) {
                res.status(500).json({ error: error.message || 'Authentication failed' });
            }
        }
    }

    // POST /logout
    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const refreshTokenFromCookie = req.cookies[REFRESH_TOKEN_COOKIE_NAME]; // Renamed variable

            if (refreshTokenFromCookie) {
                // Use imported refreshTokenService
                await refreshTokenService.deleteToken(refreshTokenFromCookie);
            }

            res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions);
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout controller error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Logout failed' });
            }
        }
    }

    // GET /me
    async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // 1. Get Token from Header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Authorization token required' });
                return;
            }
            const token = authHeader.split(' ')[1];

            // 2. Verify Access Token using authService
            const decodedPayload = authService.verifyToken(token); // Throws on failure

            // 3. Fetch User using authService
            const { id, userType } = decodedPayload;
            const user = await authService.getUserByIdAndType(id, userType);

            if (!user) {
                // This case might be less likely now if verifyToken succeeds but user is gone
                console.warn(`User ID ${id} from token not found in database (/me).`);
                res.status(404).json({ error: 'User not found' });
                return;
            }

            // 4. Response - return user details and the validated userType
            res.status(200).json({ ...user, userType: userType });

        } catch (error: any) {
            console.error('Get current user controller error:', error);
            if (error.message?.includes('Invalid or expired token')) {
                res.status(401).json({ error: 'Invalid or expired token' });
            } else if (!res.headersSent) {
                res.status(500).json({ error: error.message || 'Failed to get user data' });
            }
        }
    }
}

export const authController = new AuthController(); 