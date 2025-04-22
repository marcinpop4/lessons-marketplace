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
            // Specific handling for unique constraint violation (e.g., duplicate email)
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                // Extract the field name if possible, default to "resource"
                const targetField = error.meta?.target ? (error.meta.target as string[]).join(', ') : 'resource';
                throw new Error(`Student creation failed: The ${targetField} already exists.`);
            }
            // Handle other Prisma errors or unexpected errors by wrapping the original message
            throw new Error(`Failed to create student: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Finds a student by their ID.
     * @param prisma Prisma client instance
     * @param id The student's ID
     * @returns The student object (excluding password) or null if not found
     * @throws Error if the operation fails
     */
    async findById(prisma: PrismaClient, id: string): Promise<Omit<Student, 'password'> | null> {
        try {
            const student = await prisma.student.findUnique({
                where: { id },
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

            return student;
        } catch (error) {
            console.error('Error finding student by ID:', error);
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2023') {
                    throw new Error('Invalid ID format.');
                }
            }
            throw new Error(`Failed to find student: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // --- Potential future methods ---
    // async findById(prisma: PrismaClient, id: string): Promise<Omit<Student, 'password'> | null> { ... }
    // async update(prisma: PrismaClient, id: string, data: Prisma.StudentUpdateInput): Promise<Omit<Student, 'password'> | null> { ... }
}

export const studentService = new StudentService(); 