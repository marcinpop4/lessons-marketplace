// server/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import authService, { AuthMethod } from './auth.service.js';
import { refreshTokenService } from './refreshToken.service.js';
import { cookieOptions, REFRESH_TOKEN_COOKIE_NAME } from './auth.constants.js';
import { UserType } from '../../shared/models/UserType.js';
import { AppError, DuplicateEmailError, BadRequestError, AuthorizationError, NotFoundError } from '../errors/index.js';
import { RegisterUserDTO } from './registerUser.dto.js';
import { LoginUserDTO } from './loginUser.dto.js';
import { createChildLogger } from '../../config/logger.js';

// Create child logger for auth controller
const logger = createChildLogger('auth-controller');

export class AuthController {

    // POST /register
    async register(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Directly use the DTO type for the body for better type checking
            const registerDto: RegisterUserDTO = req.body;

            // Remove basic validation - Service layer is responsible
            // if (!registerDto.email || !registerDto.password || !registerDto.firstName /* ...etc... */) {
            //     throw new BadRequestError('Missing required fields');
            // }

            // Keep basic type check, though service should also validate robustly
            if (registerDto.userType !== 'STUDENT' && registerDto.userType !== 'TEACHER') {
                throw new BadRequestError('Invalid userType provided. Must be STUDENT or TEACHER.');
            }

            // Prepare data structure expected by authService.register
            // Ensure date is correctly parsed if it comes as string
            const registrationData = {
                ...registerDto,
                dateOfBirth: new Date(registerDto.dateOfBirth),
                auth: {
                    method: 'PASSWORD' as AuthMethod, // Assume password for now
                    password: registerDto.password
                }
            };
            // We don't need to explicitly remove password from registrationData
            // because authService.register destructures it correctly.

            const { user, accessToken, uniqueRefreshToken } = await authService.register(registrationData);

            // 3. Response
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, uniqueRefreshToken, cookieOptions);
            res.status(201).json({ user, accessToken });

        } catch (error: unknown) {
            // Pass error to central handler
            next(error);
        }
    }

    // POST /login
    async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            // Use the DTO type for the body
            const loginDto: LoginUserDTO = req.body;

            // Keep basic type check
            if (loginDto.userType !== UserType.STUDENT && loginDto.userType !== UserType.TEACHER) {
                throw new BadRequestError('Invalid userType provided. Must be STUDENT or TEACHER.');
            }

            // Call AuthService authenticate
            const { user, accessToken, uniqueRefreshToken } = await authService.authenticate(loginDto);

            // Response
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, uniqueRefreshToken, cookieOptions);
            res.status(200).json({ user, accessToken });

        } catch (error: unknown) {
            if (error instanceof AuthorizationError) {
                res.status(401).json({ error: error.message });
                return;
            }
            if (error instanceof BadRequestError) {
                res.status(400).json({ error: error.message });
                return;
            }
            // Pass other errors to central handler
            next(error);
        }
    }

    // POST /logout
    async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const refreshTokenFromCookie = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

            if (refreshTokenFromCookie) {
                await refreshTokenService.deleteToken(refreshTokenFromCookie);
            }

            res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, cookieOptions);
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    // GET /me
    async getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                // Throw specific error for central handler - remove status code argument
                throw new AuthorizationError('Authorization token required');
            }
            const token = authHeader.split(' ')[1];

            const decodedPayload = authService.verifyToken(token);

            const { id, userType } = decodedPayload;
            const user = await authService.getUserByIdAndType(id, userType);

            if (!user) {
                logger.warn(`User ID ${id} from token not found in database (/me).`);
                res.status(404).json({ message: 'User not found' });
                return;
            }

            res.status(200).json({ ...user, userType: userType });

        } catch (error: unknown) {
            // Let central handler deal with token verification errors (e.g., expired)
            next(error);
        }
    }
}

export const authController = new AuthController(); 