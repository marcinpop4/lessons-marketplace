import { AppError } from './app.error.js';

/**
 * @openapi
 * components:
 *   schemas:
 *     BadRequestError:
 *       allOf:
 *         - $ref: '#/components/schemas/AppError'
 *       type: object
 *       description: Error indicating a client-side error, such as malformed request syntax, invalid request message framing, or deceptive request routing. Typically represents validation errors.
 *       properties:
 *         name:
 *           type: string
 *           example: BadRequestError
 *         statusCode:
 *           type: integer
 *           example: 400
 *         message:
 *           type: string
 *           example: Bad request
 *   responses:
 *     BadRequestError:
 *       description: Bad Request. The request could not be understood by the server due to malformed syntax or invalid data.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BadRequestError'
 */
export class BadRequestError extends AppError {
    /**
     * Creates an instance of BadRequestError.
     * @param message - The error message. Defaults to 'Bad request'.
     */
    constructor(message = 'Bad request') {
        // Call super with message first, then status code
        super(message, 400);
        this.name = 'BadRequestError'; // Explicitly set name for clarity
    }
} 