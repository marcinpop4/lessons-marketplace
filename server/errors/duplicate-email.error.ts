import { ConflictError } from './conflict.error';

/**
 * @openapi
 * components:
 *   schemas:
 *     DuplicateEmailError:
 *       allOf:
 *         - $ref: '#/components/schemas/ConflictError'
 *       type: object
 *       description: Error indicating an attempt to create a user with an email address that already exists.
 *       properties:
 *         name:
 *           type: string
 *           example: DuplicateEmailError
 *         statusCode:
 *           type: integer
 *           example: 409
 *         message:
 *           type: string
 *           example: Email user@example.com already exists.
 */
export class DuplicateEmailError extends ConflictError {
    constructor(email: string) {
        super(`Email ${email} already exists.`);
        this.name = 'DuplicateEmailError'; // Explicitly set name
    }
}