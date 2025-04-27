/**
 * @openapi
 * components:
 *   schemas:
 *     UserType:
 *       type: string
 *       enum:
 *         - STUDENT
 *         - TEACHER
 *       description: Defines the type of user (Student or Teacher).
 */
export enum UserType {
    STUDENT = 'STUDENT',
    TEACHER = 'TEACHER',
} 