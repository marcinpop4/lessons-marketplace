import { AppError } from './app.error';

/**
 * @openapi
 * components:
 *   schemas:
 *     NotFoundError:
 *       allOf:
 *         - $ref: '#/components/schemas/AppError'
 *       type: object
 *       description: Error indicating that the requested resource could not be found.
 *       properties:
 *         name:
 *           type: string
 *           example: NotFoundError
 *         statusCode:
 *           type: integer
 *           example: 404
 *         message:
 *           type: string
 *           example: Resource not found
 */
export class NotFoundError extends AppError {
    /**
     * Creates an instance of NotFoundError.
     * @param message - The error message. Defaults to 'Resource not found'.
     */
    constructor(message = 'Resource not found') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
} 