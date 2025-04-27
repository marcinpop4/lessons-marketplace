/**
 * @openapi
 * components:
 *   schemas:
 *     AuthMethodType:
 *       type: string
 *       enum:
 *         - PASSWORD
 *         - GOOGLE
 *         - FACEBOOK
 *       description: The authentication method used by the user.
 */
export enum AuthMethodType {
    PASSWORD = 'PASSWORD',
    GOOGLE = 'GOOGLE',
    FACEBOOK = 'FACEBOOK'
} 