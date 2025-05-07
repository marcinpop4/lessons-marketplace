import { AppError } from './app.error.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     AuthenticationError:
 *       allOf:
 *         - $ref: '#/components/schemas/AppError' # Inherits properties from AppError
 *       type: object
 *       description: Error indicating an authentication failure (e.g., invalid credentials, missing token).
 *       properties:
 *         name:
 *           type: string
 *           example: AuthenticationError
 *         statusCode:
 *           type: integer
 *           example: 401
 *         message:
 *           type: string
 *           example: Authentication failed
 *   responses:
 *     UnauthorizedError:
 *       description: Unauthorized. Authentication is required and has failed or has not yet been provided.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthenticationError'
 */
export class AuthenticationError extends AppError {
    constructor(message = "Authentication failed") {
        super(message, 401); // HTTP 401 Unauthorized
        this.name = "AuthenticationError"; // Explicitly set name for clarity
    }
} 