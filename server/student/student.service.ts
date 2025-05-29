import { PrismaClient, Prisma, UserType, Student as DbStudent } from '@prisma/client';
import { Student } from '../../shared/models/Student.js';
import { DuplicateEmailError, BadRequestError } from '../errors/index.js';
import { StudentMapper } from './student.mapper.js';
import prisma from '../prisma.js'; // Import shared prisma instance
import { isUuid } from '../utils/validation.utils.js'; // Import UUID validation util
import { AppError, NotFoundError } from '../errors/index.js';
import { createChildLogger } from '../config/logger.js';

// Create child logger for student service
const logger = createChildLogger('student-service');

// Define the type for the Prisma client or transaction client
// Use Prisma.TransactionClient for the interactive transaction type
type PrismaTransactionClient = Prisma.TransactionClient;

// Define DTO for creating a student (no password)
interface StudentCreateDTO {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: Date;
    // isActive defaults to true in schema, not needed here unless overriding
}

class StudentService {
    private readonly prisma = prisma;

    /**
     * Create a new student profile (no password handling).
     * Optionally accepts a transactional Prisma client.
     * @param studentCreateDTO Student profile data
     * @param client Optional Prisma client (transactional or default).
     * @returns Created shared Student model instance or null
     */
    async create(
        studentCreateDTO: StudentCreateDTO,
        client: PrismaTransactionClient | PrismaClient = this.prisma // Type updated
    ): Promise<Student | null> {

        // --- Add Input Validation Here --- 
        const { phoneNumber, dateOfBirth, firstName, lastName, email } = studentCreateDTO;

        // Basic required fields check (already done in controller, but good defense)
        if (!email || !firstName || !lastName || !phoneNumber || !dateOfBirth) {
            throw new BadRequestError('Internal Error: Missing required fields passed to studentService.create.');
        }

        // Phone number format validation
        // Stricter regex: requires at least 7 digits, allows optional formatting chars
        const phoneRegex = /^(?=(?:\D*\d){7,})[\d\s\(\)\-\+]+$/;
        if (typeof phoneNumber !== 'string' || !phoneRegex.test(phoneNumber)) {
            throw new BadRequestError('Invalid phone number format. Requires at least 7 digits.'); // Updated error message
        }

        // Date of Birth validation (ensure it's a valid Date object)
        if (!(dateOfBirth instanceof Date) || isNaN(dateOfBirth.getTime())) {
            logger.error('[studentService] Invalid dateOfBirth received (not a Date object): ', { dateOfBirth });
            throw new BadRequestError('dateOfBirth must be a valid Date object.');
        }
        // Optional: Add check if date is reasonably valid (e.g., not in the future)
        if (dateOfBirth > new Date()) {
            throw new BadRequestError('Date of birth cannot be in the future.');
        }
        // --- End Input Validation --- 

        try {
            // Use the provided client (tx or default prisma)
            const dbStudent = await client.student.create({
                data: {
                    // Explicitly list fields instead of spreading
                    firstName: studentCreateDTO.firstName,
                    lastName: studentCreateDTO.lastName,
                    email: studentCreateDTO.email,
                    phoneNumber: studentCreateDTO.phoneNumber,
                    dateOfBirth: studentCreateDTO.dateOfBirth,
                    isActive: true // Explicitly set default if needed
                }
            });

            // Use StudentMapper to transform and return
            return StudentMapper.toModel(dbStudent);
        } catch (error) {
            // Check for Prisma unique constraint violation (P2002)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Check if the error target includes 'email' (more robust)
                const target = error.meta?.target as string[] | undefined;
                if (target && target.includes('email')) {
                    // Throw the specific custom error
                    throw new DuplicateEmailError(studentCreateDTO.email);
                }
            }
            logger.error('Error creating student profile:', { error });
            throw error;
        }
    }

    /**
     * Find a student by ID.
     * @param id Student ID
     * @returns Shared Student model instance or null if not found
     */
    async findById(id: string): Promise<Student | null> {
        // --- Add Input Validation --- 
        if (!id || !isUuid(id)) {
            throw new BadRequestError('Valid Student ID is required.');
        }
        // --- End Input Validation --- 

        try {
            const dbStudent = await this.prisma.student.findUnique({
                where: { id }
            });

            if (!dbStudent) {
                return null;
            }

            // Use StudentMapper to transform and return
            return StudentMapper.toModel(dbStudent);
        } catch (error) {
            logger.error('Error finding student:', { error });
            throw error;
        }
    }

    /**
     * Find a student by email.
     * @param email Student email
     * @returns Prisma Student database model or null if not found
     */
    async findByEmail(email: string): Promise<DbStudent | null> {
        try {
            return this.prisma.student.findUnique({
                where: { email }
            });
        } catch (error) {
            logger.error('Error finding student by email:', { error });
            throw error;
        }
    }
}

// Export singleton instance
export const studentService = new StudentService(); 