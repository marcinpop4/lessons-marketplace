/**
 * @openapi
 * components:
 *   schemas:
 *     LessonStatusValue:
 *       type: string
 *       enum: [REQUESTED, ACCEPTED, REJECTED, COMPLETED, VOIDED]
 *       description: Possible statuses for a lesson
 *     
 *     LessonType:
 *       type: string
 *       enum: [VOICE, GUITAR, BASS, DRUMS]
 *     
 *     GoalStatusValue:
 *       type: string
 *       enum: [CREATED, IN_PROGRESS, COMPLETED, CANCELLED]
 *       description: Possible statuses for a goal
 *     
 *     GoalStatusTransition:
 *       type: string
 *       enum: [START, COMPLETE, CANCEL]
 *       description: Possible transitions for a goal status
 *     
 *     ObjectiveStatusValue:
 *       type: string
 *       enum: [CREATED, IN_PROGRESS, ACHIEVED, ABANDONED]
 *       description: Possible statuses for a student objective
 *     
 *     Address:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         street:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         postalCode:
 *           type: string
 *         country:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - street
 *         - city
 *         - state
 *         - postalCode
 *         - country
 *         
 *     Student:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phoneNumber:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *       required:
 *         - id
 *         - firstName
 *         - lastName
 *         - email
 *         
 *     Teacher:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phoneNumber:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *       required:
 *         - id
 *         - firstName
 *         - lastName
 *         - email
 *     
 *     TeacherWithRates:
 *       allOf:
 *         - $ref: '#/components/schemas/Teacher'
 *         - type: object
 *           properties:
 *             lessonHourlyRates:
 *               type: object
 *               additionalProperties:
 *                 type: number
 *                 
 *     Goal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         lessonId:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         estimatedLessonCount:
 *           type: integer
 *           minimum: 1
 *         currentStatus:
 *           $ref: '#/components/schemas/GoalStatusValue'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - lessonId
 *         - title
 *         - description
 *         - estimatedLessonCount
 *         
 *     LessonRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           $ref: '#/components/schemas/LessonType'
 *         startTime:
 *           type: string
 *           format: date-time
 *         durationMinutes:
 *           type: integer
 *           minimum: 1
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         studentId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - type
 *         - startTime
 *         - durationMinutes
 *         - address
 *         - studentId
 *         
 *     LessonQuote:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         costInCents:
 *           type: integer
 *           minimum: 0
 *         lessonRequestId:
 *           type: string
 *         teacherId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         teacher:
 *           $ref: '#/components/schemas/Teacher'
 *         lessonRequest:
 *           $ref: '#/components/schemas/LessonRequest'
 *       required:
 *         - costInCents
 *         - lessonRequestId
 *         - teacherId
 *     
 *     Lesson:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         quoteId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         currentStatusId:
 *           type: string
 *         goals:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Goal'
 *       required:
 *         - quoteId
 *         - createdAt
 *         - updatedAt
 *         - currentStatusId
 *         
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *       required:
 *         - error
 */ 