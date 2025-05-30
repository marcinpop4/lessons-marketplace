/**
 * Prisma Seed Script (Refactored 2)
 *
 * This script seeds the database using service classes to adhere to architectural guidelines.
 * It focuses on creating a structured set of data for 4 students and 4 teachers.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { createChildLogger } from '../../config/logger.js';

// Import shared models and enums
import { LessonType } from '../../shared/models/LessonType.js';
import { LessonStatusTransition, LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { LessonQuoteStatusValue } from '../../shared/models/LessonQuoteStatus.js'; // Added
import { Address, AddressDTO } from '../../shared/models/Address.js';
import { Student } from '../../shared/models/Student.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { Lesson } from '../../shared/models/Lesson.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';
import { UserType } from '../../shared/models/UserType.js';
import { AuthMethod } from '../auth/auth.service.js'; // Ensure AuthMethod enum itself is imported if used directly

// Import ALL services
import { teacherService } from '../teacher/teacher.service.js';
import { studentService } from '../student/student.service.js';
import { addressService } from '../address/address.service.js';
import { lessonRequestService } from '../lessonRequest/lessonRequest.service.js';
import { lessonQuoteService } from '../lessonQuote/lessonQuote.service.js';
import { lessonService } from '../lesson/lesson.service.js';
import { teacherLessonHourlyRateService } from '../teacher-lesson-hourly-rate/teacherLessonHourlyRate.service.js';
import { objectiveService } from '../objective/objective.service.js'; // Changed import
import authService from '../auth/auth.service.js'; // Default import
import { utilService } from '../util/util.service.js'; // Import new util service

// Initialize Prisma client (not used directly except by UtilService)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // Keep for finally block

// Create logger for seed operations
const logger = createChildLogger('database-seed');

// --- Environment Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV environment variable is required');
}
const envFile = path.resolve(__dirname, `../../env/.env.${process.env.NODE_ENV}`);
const result = dotenv.config({ path: envFile });
if (result.error) {
  throw new Error(`Failed to load environment file at ${envFile}: ${result.error.message}`);
}

// --- Helper Functions ---

function getBaseRateInCents(lessonType: LessonType): number {
  switch (lessonType) {
    case LessonType.VOICE: return 5000;
    case LessonType.GUITAR: return 4500;
    case LessonType.BASS: return 4000;
    case LessonType.DRUMS: return 3500;
    default: throw new Error(`Unsupported lesson type: ${lessonType}`);
  }
}

function addToDate(date: Date, days: number, hours: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

// --- Main Seeding Logic ---

async function main() {
  const commonPassword = '12345678' // Define a fallback password directly IN the seed script if needed
  const NUM_STUDENTS = 4;
  const NUM_TEACHERS = 4;
  const NUM_ADDRESSES = 4;
  const NUM_REQUESTS_PER_STUDENT = 4;
  const ALL_LESSON_TYPES = Object.values(LessonType);

  logger.info('Starting database seeding process', {
    numStudents: NUM_STUDENTS,
    numTeachers: NUM_TEACHERS,
    numAddresses: NUM_ADDRESSES,
    requestsPerStudent: NUM_REQUESTS_PER_STUDENT
  });

  try { // Ensure main try block is present
    // 1. Clear Database using UtilService
    logger.info('Clearing existing database data');
    await utilService.clearDatabase();
    logger.info('Database cleared successfully');

    // 2. Create Base Data (Teachers, Students, Addresses)
    // Teacher Data
    const teacherData = [
      { firstName: 'Emily', lastName: 'Richardson', email: 'emily.richardson@musicschool.com', phoneNumber: '123-456-7890', dateOfBirth: new Date('1980-04-12') },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@musicschool.com', phoneNumber: '123-456-7891', dateOfBirth: new Date('1975-09-23') },
      { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia.martinez@musicschool.com', phoneNumber: '123-456-7892', dateOfBirth: new Date('1982-11-05') },
      { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@musicschool.com', phoneNumber: '123-456-7893', dateOfBirth: new Date('1978-06-18') },
    ];

    logger.info('Creating teachers', { count: teacherData.length });
    const allTeachers: Teacher[] = (await Promise.all(
      teacherData.map(teacher => authService.register({
        ...teacher,
        userType: UserType.TEACHER,
        auth: { method: AuthMethod.PASSWORD, password: commonPassword } // Corrected AuthMethod usage
      }).then(result => teacherService.getTeacherById(result.user.id))
      )
    )).filter((t): t is Teacher => t !== null);

    const teachers = allTeachers.slice(0, NUM_TEACHERS);
    if (teachers.length < NUM_TEACHERS) throw new Error(`Failed to create enough teachers. Needed ${NUM_TEACHERS}, got ${teachers.length}`);
    logger.info('Teachers created successfully', { created: teachers.length, expected: NUM_TEACHERS });

    // Student Data
    const studentData = [
      { firstName: 'Ethan', lastName: 'Parker', email: 'ethan.parker@example.com', phoneNumber: '987-654-3210', dateOfBirth: new Date('2000-05-15') },
      { firstName: 'Ava', lastName: 'Johnson', email: 'ava.johnson@example.com', phoneNumber: '987-654-3211', dateOfBirth: new Date('2001-08-22') },
      { firstName: 'Noah', lastName: 'Williams', email: 'noah.williams@example.com', phoneNumber: '987-654-3212', dateOfBirth: new Date('2000-11-07') },
      { firstName: 'Isabella', lastName: 'Lee', email: 'isabella.lee@example.com', phoneNumber: '987-654-3213', dateOfBirth: new Date('2002-03-19') },
    ];

    const allStudents: Student[] = (await Promise.all(
      studentData.map(student => authService.register({
        ...student,
        userType: UserType.STUDENT,
        auth: { method: AuthMethod.PASSWORD, password: commonPassword } // Corrected AuthMethod usage
      }).then(result => studentService.findById(result.user.id))
      )
    )).filter((s: Student | null): s is Student => s !== null);

    const students = allStudents.slice(0, NUM_STUDENTS);
    if (students.length < NUM_STUDENTS) throw new Error(`Failed to create enough students. Needed ${NUM_STUDENTS}, got ${students.length}`);
    logger.info('Students created successfully', { created: students.length, expected: NUM_STUDENTS });

    // Address Data
    const sampleAddresses = [
      { street: '123 Main Street', city: 'New York', state: 'NY', postalCode: '10001', country: 'USA' },
      { street: '456 Oak Avenue', city: 'Los Angeles', state: 'CA', postalCode: '90001', country: 'USA' },
      { street: '789 Pine Boulevard', city: 'Chicago', state: 'IL', postalCode: '60601', country: 'USA' },
      { street: '101 Maple Drive', city: 'Houston', state: 'TX', postalCode: '77001', country: 'USA' },
    ];

    const addresses: Address[] = (await Promise.all(
      sampleAddresses.slice(0, NUM_ADDRESSES).map(addr => addressService.create(addr as AddressDTO))
    )).filter((addr): addr is Address => addr !== null);
    if (addresses.length < NUM_ADDRESSES) throw new Error(`Failed to create enough addresses. Needed ${NUM_ADDRESSES}, got ${addresses.length}`);
    logger.info('Addresses created successfully', { created: addresses.length, expected: NUM_ADDRESSES });

    // 3. Create Teacher Rates
    let ratesCreatedCount = 0;
    for (const teacher of teachers) {
      for (const lessonType of ALL_LESSON_TYPES) {
        const rateInCents = getBaseRateInCents(lessonType); // Use fixed base rate
        try {
          await teacherLessonHourlyRateService.createLessonRate(teacher.id, lessonType, rateInCents);
          ratesCreatedCount++;
        } catch (e: any) {
          logger.error('Failed to create teacher lesson rate', {
            teacherId: teacher.id,
            lessonType,
            error: e.message
          });
        }
      }
    }
    const expectedRateCount = teachers.length * ALL_LESSON_TYPES.length;
    if (ratesCreatedCount < expectedRateCount) {
      logger.warn('Teacher rate creation incomplete', {
        created: ratesCreatedCount,
        expected: expectedRateCount
      });
    }
    logger.info('Teacher rates created successfully', { created: ratesCreatedCount, expected: expectedRateCount });

    const teachersWithRates: Teacher[] = await Promise.all(
      teachers.map(t => teacherService.getTeacherById(t.id))
    );

    // 4. Create Lesson Requests
    const lessonRequests: LessonRequest[] = [];
    const today = new Date();
    for (let s = 0; s < students.length; s++) {
      const student = students[s];
      const studentLessonType = ALL_LESSON_TYPES[s % ALL_LESSON_TYPES.length];

      for (let r = 0; r < NUM_REQUESTS_PER_STUDENT; r++) {
        const address = addresses[(s + r) % addresses.length];
        const startTime = addToDate(today, s * 7 + r, 10 + r * 2);

        try {
          const request = await lessonRequestService.createLessonRequest({
            studentId: student.id,
            addressDTO: {
              street: address.street,
              city: address.city,
              state: address.state,
              postalCode: address.postalCode,
              country: address.country
            },
            type: studentLessonType,
            startTime,
            durationMinutes: 60,
          });
          if (request) {
            lessonRequests.push(request);
          }
        } catch (requestError) {
          logger.error('Failed to create lesson request', {
            requestNumber: r + 1,
            studentId: student.id,
            error: requestError
          });
        }
      }
    }
    logger.info('Lesson requests created successfully', { created: lessonRequests.length });

    // 5. Create Lesson Quotes for ALL Requests from ALL Teachers
    const createdQuotes: LessonQuote[] = [];
    for (const request of lessonRequests) {
      try {
        const quotesForRequest = await lessonQuoteService.createQuotes(request, teachersWithRates);
        createdQuotes.push(...quotesForRequest);
      } catch (quoteError) {
        logger.error('Failed to create lesson quotes', {
          requestId: request.id,
          error: quoteError
        });
      }
    }
    logger.info('Lesson quotes created successfully', { created: createdQuotes.length });

    // 6. Select One Quote Per Student and Create Lessons
    const quotesToAccept: LessonQuote[] = [];
    for (const student of students) {
      // Find the first available quote for this student
      const quote = createdQuotes.find(q =>
        q.lessonRequest?.student?.id === student.id
      );
      if (quote) {
        quotesToAccept.push(quote);
      } else {
        logger.warn('No suitable quote found for student', {
          studentId: student.id.substring(0, 8)
        });
      }
    }

    // Create lessons concurrently for the selected quotes
    const lessonCreationPromises = quotesToAccept.map(async (quote) => {
      try {
        const lesson = await lessonService.create(quote.id);
        if (lesson) {
          return lesson;
        } else {
          logger.warn('Lesson service returned null', {
            quoteId: quote.id.substring(0, 8)
          });
          return null;
        }
      } catch (lessonError) {
        logger.error('Failed to create lesson', {
          quoteId: quote.id,
          error: lessonError
        });
        return null; // Return null on error
      }
    });

    const createdLessonsResults = await Promise.all(lessonCreationPromises);
    // Filter out nulls (lessons that failed to create)
    const createdLessons: Lesson[] = createdLessonsResults.filter((l): l is Lesson => l !== null);

    logger.info('Lessons created successfully', { created: createdLessons.length });

    // 7.1 Move the last lesson to the Accepted state
    const lastLesson = createdLessons[createdLessons.length - 1];
    if (lastLesson) {
      await lessonService.updateStatus(lastLesson.id, LessonStatusTransition.ACCEPT);
    }

    // 8. Create Objectives for Students (One per LessonType)
    let objectivesCreatedCount = 0;
    // Use the explicitly typed array for iteration
    for (let i = 0; i < ALL_LESSON_TYPES.length; i++) {
      const lessonType = ALL_LESSON_TYPES[i]; // Directly use the enum member

      // Assign objectives round-robin to students
      const student = students[i % students.length];


      const targetDate = addToDate(today, 30 * (i + 1), 0); // Target date 1-4 months in the future
      // Format title/description from the enum value (which is a string)
      const objectiveTitle = `Learn ${lessonType.charAt(0) + lessonType.slice(1).toLowerCase()} Basics`;
      const objectiveDescription = `Develop foundational skills in ${lessonType.toLowerCase()}.`;

      try {
        await objectiveService.createObjective(
          student.id, // Pass the student ID, not the object
          objectiveTitle,
          objectiveDescription,
          lessonType,
          targetDate
        );
        objectivesCreatedCount++;
      } catch (objectiveError) {
        logger.error('Failed to create objective', {
          studentId: student.id,
          lessonType,
          error: objectiveError
        });
      }
    }
    logger.info('Objectives created successfully', { created: objectivesCreatedCount });


  } catch (e: any) {
    logger.error('Seeding script failed', { error: e });
    throw e; // Re-throw to ensure exit code
  } finally {
    await prisma.$disconnect();
    logger.info('Database seeding completed');
  }
} // Ensure main function closing brace exists

main(); // Ensure main function call exists 