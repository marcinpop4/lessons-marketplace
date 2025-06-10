import { AppError } from './app.error';

/**
 * @openapi
 * components:
 *   schemas:
 *     ConflictError:
 *       allOf:
 *         - $ref: '#/components/schemas/AppError'
 *       type: object
 *       description: Error indicating a conflict with the current state of the target resource, such as an edit conflict or creating a resource that already exists.
 *       properties:
 *         name:
 *           type: string
 *           example: ConflictError
 *         statusCode:
 *           type: integer
 *           example: 409
 *         message:
 *           type: string
 *           example: Resource conflict
 */
export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        // Call super with message first, then status code
        super(message, 409); // HTTP 409 Conflict
        this.name = 'ConflictError'; // Explicitly set name for clarity
    }
} 