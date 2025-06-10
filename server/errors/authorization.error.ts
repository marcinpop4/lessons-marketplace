import { AppError } from './app.error';

/**
 * @openapi
 * components:
 *   schemas:
 *     AuthorizationError:
 *       allOf:
 *         - $ref: '#/components/schemas/AppError'
 *       type: object
 *       description: Error indicating an authorization failure (user is authenticated but lacks permission to perform the action).
 *       properties:
 *         name:
 *           type: string
 *           example: AuthorizationError
 *         statusCode:
 *           type: integer
 *           example: 403
 *         message:
 *           type: string
 *           example: Authorization failed
 *   responses:
 *     ForbiddenError:
 *       description: Forbidden. The server understood the request but refuses to authorize it.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthorizationError'
 */
export class AuthorizationError extends AppError {
    constructor(message = "Authorization failed") {
        super(message, 403); // HTTP 403 Forbidden
        this.name = "AuthorizationError"; // Explicitly set name for clarity
    }
} 