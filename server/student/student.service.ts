import { PrismaClient, Prisma } from '@prisma/client';
import { Student } from '../../shared/models/Student.js';
import * as bcrypt from 'bcrypt';
import { DuplicateEmailError } from '../errors/index.js';

const prisma = new PrismaClient();

class StudentService {
    private readonly prisma = prisma;

    /**
     * Create a new student
     * @param studentData Student data including password
     * @returns Created shared Student model instance
     */
    async create(studentData: Prisma.StudentCreateInput & { password: string }): Promise<Student | null> {
        try {
            // Hash password
            const hashedPassword = await bcrypt.hash(studentData.password, 10);

            // Create student with hashed password
            const dbStudent = await this.prisma.student.create({
                data: {
                    ...studentData,
                    password: hashedPassword,
                    authMethods: ['PASSWORD'],
                    isActive: true
                }
            });

            // Use Student.fromDb to transform and return
            return Student.fromDb(dbStudent);
        } catch (error) {
            // Check for Prisma unique constraint violation (P2002)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Check if the error target includes 'email' (more robust)
                const target = error.meta?.target as string[] | undefined;
                if (target && target.includes('email')) {
                    // Throw the specific custom error
                    throw new DuplicateEmailError(studentData.email);
                }
            }
            // Log and re-throw other errors
            console.error('Error creating student:', error);
            throw error;
        }
    }

    /**
     * Find a student by ID
     * @param id Student ID
     * @returns Shared Student model instance or null if not found
     */
    async findById(id: string): Promise<Student | null> {
        try {
            const dbStudent = await this.prisma.student.findUnique({
                where: { id }
            });

            if (!dbStudent) {
                return null;
            }

            // Use Student.fromDb to transform and return
            return Student.fromDb(dbStudent);
        } catch (error) {
            console.error('Error finding student:', error);
            throw error;
        }
    }

    // --- Potential future methods ---
    // async findById(prisma: PrismaClient, id: string): Promise<Omit<Student, 'password'> | null> { ... }
    // async update(prisma: PrismaClient, id: string, data: Prisma.StudentUpdateInput): Promise<Omit<Student, 'password'> | null> { ... }
}

// Export singleton instance
export const studentService = new StudentService(); 