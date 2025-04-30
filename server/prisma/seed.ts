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
import chalk from 'chalk'; // Import chalk

// Import shared models and enums
import { LessonType } from '../../shared/models/LessonType.js';
import { LessonStatusTransition, LessonStatusValue } from '../../shared/models/LessonStatus.js';
import { LessonQuoteStatusValue } from '../../shared/models/LessonQuoteStatus.js'; // Added
import { GoalStatusValue, GoalStatusTransition } from '../../shared/models/GoalStatus.js';
import { Goal } from '../../shared/models/Goal.js';
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
import { goalService } from '../goal/goal.service.js';
import { objectiveService } from '../objective/objective.service.js'; // Changed import
import authService from '../auth/auth.service.js'; // Default import
import { utilService } from '../util/util.service.js'; // Import new util service
import { SEED_USER_PASSWORD } from '../../tests/e2e/constants.js';

// Initialize Prisma client (not used directly except by UtilService)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient(); // Keep for finally block

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

// Sample Goal Data Generator (kept from original)
function getSampleGoalData(lessonType: LessonType) {
  const goals = [
    { title: 'Understand Basic Theory', description: 'Learn fundamental concepts.', estimatedLessonCount: 2 },
    { title: 'Practice Basic Scales', description: 'Practice major/minor scales.', estimatedLessonCount: 4 },
    { title: 'Play Simple Song', description: 'Learn a simple song.', estimatedLessonCount: 3 }
  ];
  // Simple selection for now
  if (lessonType === LessonType.DRUMS) return goals[1]; // Practice scales (rudiments)
  if (lessonType === LessonType.GUITAR) return goals[2]; // Play song
  return goals[0]; // Basic theory for others
}

// --- Main Seeding Logic ---

async function main() {
  const commonPassword = SEED_USER_PASSWORD
  const NUM_STUDENTS = 4;
  const NUM_TEACHERS = 4;
  const NUM_ADDRESSES = 4;
  const NUM_REQUESTS_PER_STUDENT = 4;
  const ALL_LESSON_TYPES = Object.values(LessonType);

  try { // Ensure main try block is present
    // 1. Clear Database using UtilService
    await utilService.clearDatabase();
    console.log(chalk.yellow('Database cleared.')); // Summary log

    // 2. Create Base Data (Teachers, Students, Addresses)
    // Teacher Data
    const teacherData = [
      { firstName: 'Emily', lastName: 'Richardson', email: 'emily.richardson@musicschool.com', phoneNumber: '123-456-7890', dateOfBirth: new Date('1980-04-12') },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@musicschool.com', phoneNumber: '123-456-7891', dateOfBirth: new Date('1975-09-23') },
      { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia.martinez@musicschool.com', phoneNumber: '123-456-7892', dateOfBirth: new Date('1982-11-05') },
      { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@musicschool.com', phoneNumber: '123-456-7893', dateOfBirth: new Date('1978-06-18') },
    ];

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
    console.log(chalk.green(`✓ ${teachers.length} Teachers created.`)); // Summary log

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
    console.log(chalk.green(`✓ ${students.length} Students created.`)); // Summary log

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
    console.log(chalk.green(`✓ ${addresses.length} Addresses created.`)); // Summary log

    // 3. Create Teacher Rates
    let ratesCreatedCount = 0;
    for (const teacher of teachers) {
      for (const lessonType of ALL_LESSON_TYPES) {
        const rateInCents = getBaseRateInCents(lessonType); // Use fixed base rate
        try {
          await teacherLessonHourlyRateService.createOrUpdateLessonRate(teacher.id, lessonType, rateInCents);
          ratesCreatedCount++;
        } catch (rateError) {
          console.error(chalk.red(`Failed to create rate for teacher ${teacher.id}, type ${lessonType}:`), rateError);
        }
      }
    }
    const expectedRateCount = teachers.length * ALL_LESSON_TYPES.length;
    if (ratesCreatedCount < expectedRateCount) {
      console.warn(chalk.yellow(`Warning: Created ${ratesCreatedCount} rates, expected ${expectedRateCount}. Some teachers might be missing rates.`));
    }
    console.log(chalk.green(`✓ ${ratesCreatedCount} Teacher Rates created/updated.`)); // Summary log

    const teachersWithRates: Teacher[] = await Promise.all(
      teachers.map(t => teacherService.getTeacherById(t.id))
    );
    // console.log(`Refetched ${teachersWithRates.length} teachers with rates.`); // Removed internal log


    // 4. Create Lesson Requests
    const lessonRequests: LessonRequest[] = [];
    const today = new Date();
    for (let s = 0; s < students.length; s++) {
      const student = students[s];
      const studentLessonType = ALL_LESSON_TYPES[s % ALL_LESSON_TYPES.length];
      // console.log(`  Student ${s + 1} (${student.firstName}) requesting ${studentLessonType}...`); // Removed internal log

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
          console.error(chalk.red(`Failed to create lesson request ${r + 1} for student ${student.id}:`), requestError);
        }
      }
    }
    console.log(chalk.green(`✓ ${lessonRequests.length} Lesson Requests created.`)); // Summary log

    // 5. Create Lesson Quotes for ALL Requests from ALL Teachers
    const createdQuotes: LessonQuote[] = [];
    for (const request of lessonRequests) {
      try {
        const quotesForRequest = await lessonQuoteService.createQuotes(request, teachersWithRates);
        createdQuotes.push(...quotesForRequest);
        // console.log(`  Created ${quotesForRequest.length} quotes for request ${request.id.substring(0, 8)}...`); // Removed internal log
      } catch (quoteError) {
        console.error(chalk.red(`Failed to create quotes for request ${request.id}:`), quoteError);
      }
    }
    console.log(chalk.green(`✓ ${createdQuotes.length} Lesson Quotes created.`)); // Summary log

    // 6. Select One Quote Per Student and Create Lessons
    const quotesToAccept: LessonQuote[] = [];
    for (const student of students) {
      // Find the first available quote for this student
      const quote = createdQuotes.find(q =>
        q.lessonRequest?.student?.id === student.id
      );
      if (quote) {
        quotesToAccept.push(quote);
        // console.log(`  Selected quote ${quote.id.substring(0, 8)} for student ${student.id.substring(0, 8)}.`); // Removed internal log
      } else {
        console.warn(chalk.yellow(`Warning: No suitable quote found for student ${student.id.substring(0, 8)}. This student will not have a lesson.`));
      }
    }

    // Create lessons concurrently for the selected quotes
    const lessonCreationPromises = quotesToAccept.map(async (quote) => {
      try {
        // console.log(`Creating lesson for quote ${quote.id.substring(0, 8)}...`); // Removed internal log
        const lesson = await lessonService.create(quote.id);
        if (lesson) {
          // console.log(`Lesson ${lesson.id.substring(0, 8)} created.`); // Removed internal log
          return lesson;
        } else {
          console.warn(chalk.yellow(`Warning: lessonService.create returned null for quote ${quote.id.substring(0, 8)}.`)); // Keep warning
          return null;
        }
      } catch (lessonError) {
        console.error(chalk.red(`Failed to create lesson for quote ${quote.id}:`), lessonError);
        return null; // Return null on error
      }
    });

    const createdLessonsResults = await Promise.all(lessonCreationPromises);
    // Filter out nulls (lessons that failed to create)
    const createdLessons: Lesson[] = createdLessonsResults.filter((l): l is Lesson => l !== null);

    console.log(chalk.green(`✓ ${createdLessons.length} Lessons created.`)); // Summary log

    // 7.1 Move the last lesson to the Accepted state
    const lastLesson = createdLessons[createdLessons.length - 1];
    if (lastLesson) {
      await lessonService.updateStatus(lastLesson.id, LessonStatusTransition.ACCEPT);
    }

    // 7. Create Goals for Lessons
    let goalsCreatedCount = 0;
    for (const lesson of createdLessons) {
      // Refetch the lesson WITH necessary relations for goal creation, as lessonService.create might not return them
      let lessonForGoal: Lesson | null = null;
      try {
        lessonForGoal = lesson; // Use the lesson we already have

      } catch (fetchError) {
        // This catch block might not be needed if we use the existing lesson object
        console.error(chalk.red(`  Error potentially occurred while trying to refetch lesson ${lesson.id}:`), fetchError);
        lessonForGoal = null; // Ensure it's null if fetch fails
      }

      if (!lessonForGoal) {
        console.warn(chalk.yellow(`Warning: Skipping goal creation for lesson ${lesson.id.substring(0, 8)} because lesson data is unavailable.`));
        continue;
      }


      const teacherId = lessonForGoal.quote?.teacher?.id;
      const lessonType = lessonForGoal.quote?.lessonRequest?.type;

      if (!teacherId || !lessonType) {
        console.warn(chalk.yellow(`Warning: Skipping goal creation for lesson ${lessonForGoal.id.substring(0, 8)} due to missing teacher/type info in the lesson object.`));
        continue;
      }

      const goalData = getSampleGoalData(lessonType);
      try {
        await goalService.createGoal(
          teacherId,
          lessonForGoal.id,
          goalData.title,
          goalData.description,
          goalData.estimatedLessonCount
        );
        goalsCreatedCount++;
        // console.log(`  Created goal for lesson ${lessonForGoal.id.substring(0, 8)} by teacher ${teacherId.substring(0, 8)}.`); // Removed internal log
      } catch (goalError) {
        console.error(chalk.red(`Failed to create goal for lesson ${lessonForGoal.id}:`), goalError);
      }
    }
    console.log(chalk.green(`✓ ${goalsCreatedCount} Goals created.`)); // Summary log

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
        // console.log(`  Created ${lessonType} objective for student ${student.id.substring(0, 8)}.`); // Internal log
      } catch (objectiveError) {
        console.error(chalk.red(`Failed to create objective for student ${student.id}, type ${lessonType}:`), objectiveError);
      }
    }
    console.log(chalk.green(`✓ ${objectivesCreatedCount} Objectives created.`)); // Summary log


  } catch (e) { // Ensure catch block exists
    console.error(chalk.red("Seeding script failed:"), e);
    process.exit(1);
  } finally { // Ensure finally block exists
    await prisma.$disconnect();
    console.log(chalk.blue('Seeding script finished.'));
  }
} // Ensure main function closing brace exists

main(); // Ensure main function call exists 