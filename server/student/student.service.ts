import { PrismaClient, Student } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import { Prisma } from '@prisma/client'; // Import Prisma namespace for types

class StudentService {
    private readonly saltRounds = 10;

    /**
     * Creates a new student, hashing their password.
     * @param prisma Prisma client instance
     * @param studentData Data for the new student, including a plain text password.
     * @returns The created student object (excluding password).
     * @throws Error if creation fails.
     */
    async create(prisma: PrismaClient, studentData: Prisma.StudentCreateInput & { password: string }): Promise<Omit<Student, 'password'> | null> {
        try {
            const { password, ...restData } = studentData;

            if (!password) {
                throw new Error('Password is required to create a student.');
            }

            const hashedPassword = await bcryptjs.hash(password, this.saltRounds);

            const newStudent = await prisma.student.create({
                data: {
                    ...restData,
                    password: hashedPassword,
                    authMethods: ['PASSWORD'], // Default to PASSWORD auth
                    isActive: true // Default to active
                },
                // Exclude password from the returned object
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    dateOfBirth: true,
                    isActive: true,
                    authMethods: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            return newStudent;
        } catch (error) {
            console.error('Error creating student:', error);
            // Consider more specific error handling (e.g., for unique constraint violations)
            throw new Error(`Failed to create student: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    // --- Potential future methods ---
    // async findById(prisma: PrismaClient, id: string): Promise<Omit<Student, 'password'> | null> { ... }
    // async update(prisma: PrismaClient, id: string, data: Prisma.StudentUpdateInput): Promise<Omit<Student, 'password'> | null> { ... }
}

export const studentService = new StudentService(); 