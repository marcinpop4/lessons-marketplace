import { PrismaClient, Prisma } from '@prisma/client';
import { Student } from '../../shared/models/Student.js';
import bcrypt from 'bcrypt';
import prisma from '../prisma.js';

class StudentService {
    private readonly prisma = prisma;

    /**
     * Create a new student
     * @param studentData Student data including password
     * @returns Created student without password
     */
    async create(studentData: Prisma.StudentCreateInput & { password: string }): Promise<Omit<Student, 'password'> | null> {
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

            // Transform to domain model
            const student = new Student({
                id: dbStudent.id,
                firstName: dbStudent.firstName,
                lastName: dbStudent.lastName,
                email: dbStudent.email,
                phoneNumber: dbStudent.phoneNumber,
                dateOfBirth: dbStudent.dateOfBirth,
                isActive: dbStudent.isActive
            });

            // Return student without sensitive data
            return student;
        } catch (error) {
            console.error('Error creating student:', error);
            // Check for Prisma unique constraint violation (P2002)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Assuming the constraint violation is on the email field based on the test context
                throw new Error(`Student with email ${studentData.email} already exists.`);
            }
            // Re-throw other errors
            throw error;
        }
    }

    /**
     * Find a student by ID
     * @param id Student ID
     * @returns Student without password or null if not found
     */
    async findById(id: string): Promise<Omit<Student, 'password'> | null> {
        try {
            const dbStudent = await this.prisma.student.findUnique({
                where: { id }
            });

            if (!dbStudent) {
                return null;
            }

            // Transform to domain model
            const student = new Student({
                id: dbStudent.id,
                firstName: dbStudent.firstName,
                lastName: dbStudent.lastName,
                email: dbStudent.email,
                phoneNumber: dbStudent.phoneNumber,
                dateOfBirth: dbStudent.dateOfBirth,
                isActive: dbStudent.isActive
            });

            // Return student without sensitive data
            return student;
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