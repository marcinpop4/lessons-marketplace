/**
 * Prisma Seed Script (Refactored)
 * 
 * This script seeds the database using service classes to adhere to architectural guidelines.
 * It relies on shared models and service logic for data creation and validation.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
// import bcryptjs from 'bcryptjs'; // No longer needed here

// Import shared models and enums
import { LessonType } from '@shared/models/LessonType';
// Import both value and transition enums for LessonStatus
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';
import { GoalStatusValue, GoalStatusTransition } from '@shared/models/GoalStatus';
import { Goal } from '@shared/models/Goal';
import { Address, AddressDTO } from '../../shared/models/Address.js';
import { Student } from '../../shared/models/Student.js';
import { Teacher } from '../../shared/models/Teacher.js';
import { LessonRequest } from '../../shared/models/LessonRequest.js';
import { LessonQuote } from '../../shared/models/LessonQuote.js';
import { Lesson } from '../../shared/models/Lesson.js';
import { TeacherLessonHourlyRate } from '../../shared/models/TeacherLessonHourlyRate.js';

// Import ALL services 
import { teacherService } from '../teacher/teacher.service.js';
import { studentService } from '../student/student.service.js';
import { addressService } from '../address/address.service.js';
import { lessonRequestService } from '../lessonRequest/lessonRequest.service.js';
// Import the lesson quote service
import { lessonQuoteService } from '../lessonQuote/lessonQuote.service.js';
import { lessonService } from '../lesson/lesson.service.js';
import { teacherLessonHourlyRateService } from '../teacher-lesson-hourly-rate/teacherLessonHourlyRate.service.js';
import { goalService } from '../goal/goal.service.js';

// Import authService
import authService, { AuthMethod } from '../auth/auth.service.js';
import { UserType } from '../../shared/models/UserType.js';

// Initialize Prisma client (passed to services)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Load environment variables from .env file in the project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile = path.resolve(__dirname, `../../env/.env.${process.env.NODE_ENV}`);

if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV environment variable is required');
}

const result = dotenv.config({ path: envFile });
if (result.error) {
  throw new Error(`Failed to load environment file at ${envFile}: ${result.error.message}`);
}

// Function to get base rate
function getBaseRateInCents(lessonType: LessonType): number {
  switch (lessonType) {
    case LessonType.VOICE: return 5000;
    case LessonType.GUITAR: return 4500;
    case LessonType.BASS: return 4000;
    case LessonType.DRUMS: return 3500;
    default: throw new Error(`Unsupported lesson type: ${lessonType}`);
  }
}

// Helper function to add days/hours to a date
function addToDate(date: Date, days: number, hours: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

// Hash password function REMOVED - Handled by services
// async function hashPassword(password) { ... }

// Sample addresses 
const sampleAddresses = [
  { street: '123 Main Street', city: 'New York', state: 'NY', postalCode: '10001', country: 'USA' },
  { street: '456 Oak Avenue', city: 'Los Angeles', state: 'CA', postalCode: '90001', country: 'USA' },
  { street: '789 Pine Boulevard', city: 'Chicago', state: 'IL', postalCode: '60601', country: 'USA' },
  { street: '101 Maple Drive', city: 'Houston', state: 'TX', postalCode: '77001', country: 'USA' },
  { street: '202 Cedar Lane', city: 'Miami', state: 'FL', postalCode: '33101', country: 'USA' }
];

// Sample Goal Data Generator
function getSampleGoalData(lessonType: LessonType, studentAge: number) {
  // Basic goals, customize further based on type/age
  const goals = [
    {
      created: { title: 'Understand Basic Theory', description: 'Learn the fundamental concepts related to the instrument.', estimatedLessonCount: 2 },
      started: { title: 'Practice Basic Scales', description: 'Practice the major and minor scales daily.', estimatedLessonCount: 4 },
      achieved: { title: 'Play First Simple Song', description: 'Learn and play a simple song from start to finish.', estimatedLessonCount: 3, context: { notes: 'Student successfully played \'Twinkle Twinkle Little Star\' with steady rhythm and correct notes.' } }
    }
  ];

  // Example customization (can be expanded)
  if (lessonType === LessonType.GUITAR && studentAge > 12) {
    goals[0].started.title = 'Practice Chord Transitions';
    goals[0].started.description = 'Practice transitioning smoothly between G, C, and D chords.';
    goals[0].achieved.context.notes = 'Student can now play the basic chord progression for \'Knockin\' on Heaven\'s Door\'.';
  }
  if (lessonType === LessonType.DRUMS) {
    goals[0].created.title = 'Basic Drum Setup & Grip';
    goals[0].created.description = 'Learn how to set up the drum kit correctly and hold the sticks properly.';
    goals[0].started.title = 'Practice Basic Rock Beat';
    goals[0].started.description = 'Practice a standard 4/4 rock beat (kick, snare, hi-hat).';
    goals[0].achieved.title = 'Play Beat with Simple Fill';
    goals[0].achieved.description = 'Maintain a steady rock beat and incorporate a simple drum fill.';
    goals[0].achieved.context.notes = 'Student can play a steady basic rock beat for 1 minute and execute a simple snare fill on cue.';
  }

  // Select one set for this lesson
  return goals[0]; // Just returning the first set for simplicity
}

// --- Helper: Determine Transition Sequence ---
function getTransitionsToReachStatus(targetStatus: LessonStatusValue): LessonStatusTransition[] {
  switch (targetStatus) {
    case LessonStatusValue.REQUESTED:
      return [];
    case LessonStatusValue.ACCEPTED:
      return [LessonStatusTransition.ACCEPT];
    case LessonStatusValue.REJECTED:
      return [LessonStatusTransition.REJECT];
    case LessonStatusValue.DEFINED:
      return [LessonStatusTransition.ACCEPT, LessonStatusTransition.DEFINE];
    case LessonStatusValue.COMPLETED:
      return [LessonStatusTransition.ACCEPT, LessonStatusTransition.DEFINE, LessonStatusTransition.COMPLETE];
    // Define a path to VOIDED, e.g., via DEFINED state
    case LessonStatusValue.VOIDED:
      return [LessonStatusTransition.ACCEPT, LessonStatusTransition.DEFINE, LessonStatusTransition.VOID];
    default:
      console.warn(`Unsupported target status for transition generation: ${targetStatus}`);
      return [];
  }
}

// Helper function to safely delete records from tables that may not exist yet
async function safeDeleteMany(tableName: string): Promise<void> {
  try {
    // Use dynamic property access to check if the table exists
    const table = (prisma as any)[tableName];
    if (table && typeof table.deleteMany === 'function') {
      await table.deleteMany();
      console.log(`Successfully cleared ${tableName} table.`);
    } else {
      console.log(`Skipping deletion for ${tableName} - table not found in schema.`);
    }
  } catch (error) {
    console.warn(`Error clearing ${tableName} table:`, error);
  }
}

async function main() {

  const commonPassword = "1234";

  // --- Define target statuses early --- 
  const targetStatuses: LessonStatusValue[] = [
    LessonStatusValue.REQUESTED,
    LessonStatusValue.ACCEPTED,
    LessonStatusValue.DEFINED,
    LessonStatusValue.REJECTED,
    LessonStatusValue.COMPLETED,
    LessonStatusValue.VOIDED
  ];

  try {
    // Clear existing data (using direct Prisma for seed cleanup)
    await prisma.$transaction([
      // Delete records that depend on others first
      prisma.goalStatus.deleteMany(),
      prisma.goal.deleteMany(),
      prisma.lessonStatus.deleteMany(),
      // Now delete records that others depended on
      prisma.lesson.deleteMany(),       // Depends on LessonQuote
      prisma.lessonQuote.deleteMany(),    // Depends on LessonRequest, Teacher
      prisma.lessonRequest.deleteMany(),  // Depends on Student, Address
      prisma.teacherLessonHourlyRate.deleteMany(), // Depends on Teacher
      // Delete auth-related tables
      prisma.userAuthMethod.deleteMany(),
      prisma.passwordCredential.deleteMany(),
      // Now delete the base records
      prisma.address.deleteMany(),
      prisma.teacher.deleteMany(),
      prisma.student.deleteMany(),
      // Note: RefreshToken might need deletion if used, but not included here
    ]);

    // Create Teachers using TeacherService
    const teacherData = [
      { firstName: 'Emily', lastName: 'Richardson', email: 'emily.richardson@musicschool.com', phoneNumber: '123-456-7890', dateOfBirth: new Date('1980-04-12') },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@musicschool.com', phoneNumber: '123-456-7891', dateOfBirth: new Date('1975-09-23') },
      { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia.martinez@musicschool.com', phoneNumber: '123-456-7892', dateOfBirth: new Date('1982-11-05') },
      { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@musicschool.com', phoneNumber: '123-456-7893', dateOfBirth: new Date('1978-06-18') },
      { firstName: 'Olivia', lastName: 'Thompson', email: 'olivia.thompson@musicschool.com', phoneNumber: '123-456-7894', dateOfBirth: new Date('1985-02-27') }
    ];

    // Create teachers using authService.register for proper credential setup
    const teachers: Teacher[] = await Promise.all(
      teacherData.map(teacher => {
        const registrationData = {
          ...teacher,
          userType: UserType.TEACHER,
          auth: {
            method: 'PASSWORD' as AuthMethod,
            password: commonPassword
          }
        };
        return authService.register(registrationData)
          .then(result => {
            // Return full teacher object, not just what's in the auth result
            return teacherService.findById(result.user.id);
          });
      })
    ).then(results => results.filter((t): t is Teacher => t !== null));

    console.log('Teachers created (via service):', teachers.length);

    // Get Emily Richardson's teacher record (for tests)
    const emilyRichardson = teachers.find(teacher => teacher.email === 'emily.richardson@musicschool.com');
    if (!emilyRichardson) {
      throw new Error('Emily Richardson teacher record not found');
    }

    // Create Students using StudentService with proper auth
    const studentData = [
      { firstName: 'Ethan', lastName: 'Parker', email: 'ethan.parker@example.com', phoneNumber: '987-654-3210', dateOfBirth: new Date('2000-05-15') },
      { firstName: 'Ava', lastName: 'Johnson', email: 'ava.johnson@example.com', phoneNumber: '987-654-3211', dateOfBirth: new Date('2001-08-22') },
      { firstName: 'Noah', lastName: 'Williams', email: 'noah.williams@example.com', phoneNumber: '987-654-3212', dateOfBirth: new Date('2000-11-07') },
      { firstName: 'Isabella', lastName: 'Lee', email: 'isabella.lee@example.com', phoneNumber: '987-654-3213', dateOfBirth: new Date('2002-03-19') },
      { firstName: 'Lucas', lastName: 'Garcia', email: 'lucas.garcia@example.com', phoneNumber: '987-654-3214', dateOfBirth: new Date('2003-07-01') },
      { firstName: 'Mia', lastName: 'Brown', email: 'mia.brown@example.com', phoneNumber: '987-654-3215', dateOfBirth: new Date('2004-09-30') },
      { firstName: 'Benjamin', lastName: 'Davis', email: 'benjamin.davis@example.com', phoneNumber: '987-654-3216', dateOfBirth: new Date('2005-01-14') },
      { firstName: 'Zoe', lastName: 'Rodriguez', email: 'zoe.rodriguez@example.com', phoneNumber: '987-654-3217', dateOfBirth: new Date('2006-04-25') },
      { firstName: 'Samuel', lastName: 'Smith', email: 'samuel.smith@example.com', phoneNumber: '987-654-3218', dateOfBirth: new Date('2007-06-03') },
      { firstName: 'Charlotte', lastName: 'Taylor', email: 'charlotte.taylor@example.com', phoneNumber: '987-654-3219', dateOfBirth: new Date('2008-10-17') }
    ];

    // Create students using authService.register for proper credential setup
    const students: Student[] = await Promise.all(
      studentData.map(student => {
        const registrationData = {
          ...student,
          userType: UserType.STUDENT,
          auth: {
            method: 'PASSWORD' as AuthMethod,
            password: commonPassword
          }
        };
        return authService.register(registrationData)
          .then(result => {
            // Return full student object, not just what's in the auth result
            return studentService.findById(result.user.id);
          });
      })
    ).then(results => results.filter((s): s is Student => s !== null));

    console.log('Students created (via service):', students.length);

    // Create Addresses using AddressService
    const createdAddresses = await Promise.all(
      sampleAddresses.map(addressData => {
        const addressDto: AddressDTO = {
          street: addressData.street,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country
        };
        return addressService.create(addressDto);
      })
    );
    const addresses: Address[] = createdAddresses.filter((addr): addr is Address => addr !== null);
    if (addresses.length !== sampleAddresses.length) {
      console.warn('Warning: Some addresses failed to create.');
    }
    console.log('Addresses created (via service):', addresses.length);

    // Create Hourly Rates using TeacherLessonHourlyRateService
    const createdHourlyRates: (TeacherLessonHourlyRate | null)[] = [];
    for (const teacher of teachers) {
      const teacherRates = await Promise.all(
        Object.values(LessonType).map(async (lessonType) => {
          const baseRateInCents = getBaseRateInCents(lessonType);
          const rateVariationInCents = Math.floor(Math.random() * 10) * 500;
          const rateInCents = baseRateInCents + rateVariationInCents;
          return teacherLessonHourlyRateService.findOrCreateOrUpdate(
            teacher.id,
            lessonType,
            rateInCents
          );
        })
      );
      createdHourlyRates.push(...teacherRates);
    }
    const teacherLessonHourlyRates: TeacherLessonHourlyRate[] = createdHourlyRates.filter((rate): rate is TeacherLessonHourlyRate => rate !== null);
    console.log('TeacherLessonHourlyRates created (via service):', teacherLessonHourlyRates.length);

    // Create Lesson Requests using LessonRequestService
    const lessonRequests: LessonRequest[] = [];
    const lessonTypes = Object.values(LessonType);
    const today = new Date();
    const numLessonsPerStatus = 5;
    const numTargetStatuses = targetStatuses.length;
    const numBaseLessonRequests = numLessonsPerStatus * numTargetStatuses;
    const numTotalLessonRequests = numBaseLessonRequests + 1;

    for (let i = 0; i < numTotalLessonRequests; i++) {
      const student = students[i % students.length];
      const lessonType = lessonTypes[i % lessonTypes.length];
      const address = addresses[i % addresses.length];
      const startTime = addToDate(today, Math.floor(i / 4), 9 + (i % 8));

      if (!address) {
        console.warn(`Skipping lesson request creation for index ${i} due to missing address.`);
        continue;
      }

      const request = await lessonRequestService.createLessonRequest({
        studentId: student.id,
        addressDTO: {
          street: address.street,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country
        },
        type: lessonType,
        startTime,
        durationMinutes: 60,
      });
      if (request) {
        lessonRequests.push(request);
      }
    }
    console.log(`LessonRequests created (via service): ${lessonRequests.length}`);

    // Create Lesson Quotes using LessonQuoteService
    const emilyQuotes: LessonQuote[] = [];
    const emilyHourlyRates = teacherLessonHourlyRates.filter(rate => rate.teacherId === emilyRichardson.id);
    if (lessonRequests.length < numTotalLessonRequests) {
      throw new Error(`Not enough lesson requests for seeding. Need ${numTotalLessonRequests}, got ${lessonRequests.length}.`);
    }

    for (let i = 0; i < numTotalLessonRequests; i++) {
      const request = lessonRequests[i];
      const hourlyRate = emilyHourlyRates.find(rate => rate.type === request.type);
      if (!hourlyRate) throw new Error(`No rate for Emily for ${request.type} on request ${i}`);
      const costInCents = Math.round((hourlyRate.rateInCents * request.durationMinutes) / 60);

      const quote = await lessonQuoteService.create({
        lessonRequestId: request.id,
        teacherId: emilyRichardson.id,
        costInCents,
        hourlyRateInCents: hourlyRate.rateInCents,
      });
      if (quote) {
        emilyQuotes.push(quote);
      }
    }
    console.log(`LessonQuotes created for Emily (via service): ${emilyQuotes.length}`);

    // --- NEW SEEDING LOGIC: Create 5 Lessons per Status --- 
    const createdLessonsData: { lesson: Lesson | null; finalStatus: LessonStatusValue | string }[] = [];
    let quoteIndex = 0;

    for (const targetStatus of targetStatuses) {
      for (let i = 0; i < 5; i++) {
        if (quoteIndex >= numBaseLessonRequests) {
          console.warn('Warning: Reached quote limit unexpectedly during status loop.');
          break;
        }
        const quote = emilyQuotes[quoteIndex++];
        if (!quote) {
          console.warn(`Skipping lesson creation for quote index ${quoteIndex - 1} due to missing quote.`);
          continue;
        }

        const createdLessonInitial = await lessonService.create(quote.id);
        if (!createdLessonInitial?.id) {
          console.error(`Failed to create lesson for quote ${quote.id}`);
          continue;
        }
        const lessonId = createdLessonInitial.id;

        let currentLessonState: Lesson | null = createdLessonInitial;

        try {
          const transitions = getTransitionsToReachStatus(targetStatus);
          for (const transition of transitions) {
            let context = {};
            if (transition === LessonStatusTransition.COMPLETE) {
              context = { notes: 'Lesson completed during seed.' };
            }
            currentLessonState = await lessonService.updateStatus(
              lessonId,
              transition,
              context,
              emilyRichardson.id
            );
            if (!currentLessonState) {
              throw new Error(`Failed to apply transition ${transition} to lesson ${lessonId}`);
            }
          }
          createdLessonsData.push({ lesson: currentLessonState, finalStatus: targetStatus });
        } catch (transitionError) {
          console.error(`   ERROR transitioning lesson ${lessonId.substring(0, 8)}... for target ${targetStatus}. Error: ${transitionError instanceof Error ? transitionError.message : transitionError}`);
          const finalStatusOnError = currentLessonState?.currentStatus?.status || 'UNKNOWN';
          createdLessonsData.push({ lesson: currentLessonState, finalStatus: finalStatusOnError });
        }
      }
    }

    // --- Create 1 extra DEFINED lesson with NO goals for testing --- 
    const extraQuoteForDefinedLesson = emilyQuotes[numBaseLessonRequests];
    let goalFreeDefinedLesson: Lesson | null = null;
    try {
      if (!extraQuoteForDefinedLesson) {
        throw new Error('Missing the extra quote needed for the goal-free defined lesson.');
      }
      const initialLesson = await lessonService.create(extraQuoteForDefinedLesson.id);
      if (!initialLesson?.id) throw new Error('Failed to create initial goal-free lesson.');

      const acceptedLesson = await lessonService.updateStatus(initialLesson.id, LessonStatusTransition.ACCEPT, {}, emilyRichardson.id);
      if (!acceptedLesson) {
        throw new Error('Failed to transition goal-free lesson to ACCEPTED');
      }

      goalFreeDefinedLesson = await lessonService.updateStatus(acceptedLesson.id, LessonStatusTransition.DEFINE, {}, emilyRichardson.id);
    } catch (error) {
      console.error(`   ERROR creating special goal-free DEFINED lesson: ${error instanceof Error ? error.message : error}`);
    }
    // --- End extra lesson creation --- 

    // --- Create Goals for DEFINED/COMPLETED lessons --- 
    let goalsCreatedCount = 0;
    const lessonsForGoals = createdLessonsData
      .filter(data => data.lesson && (data.finalStatus === LessonStatusValue.DEFINED || data.finalStatus === LessonStatusValue.COMPLETED))
      .map(data => data.lesson as Lesson);

    for (const lesson of lessonsForGoals) {
      const student = lesson.quote?.lessonRequest?.student;
      const lessonType = lesson.quote?.lessonRequest?.type;
      const lessonId = lesson.id;

      if (!student || !lessonType || !lessonId) {
        console.warn(`   Skipping goal creation for lesson ${lessonId?.substring(0, 8) ?? 'UNKNOWN'}... due to missing required nested data.`);
        continue;
      }

      const studentAge = new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear();
      const sampleGoals = getSampleGoalData(lessonType, studentAge);

      try {
        const createdGoal = await goalService.createGoal(
          lesson.id,
          sampleGoals.created.title,
          sampleGoals.created.description,
          sampleGoals.created.estimatedLessonCount
        );
        goalsCreatedCount++;

        const startedGoal = await goalService.createGoal(
          lesson.id,
          sampleGoals.started.title,
          sampleGoals.started.description,
          sampleGoals.started.estimatedLessonCount
        );
        await goalService.updateGoalStatus(startedGoal.id, GoalStatusTransition.START);
        goalsCreatedCount++;

        const achievedGoal = await goalService.createGoal(
          lesson.id,
          sampleGoals.achieved.title,
          sampleGoals.achieved.description,
          sampleGoals.achieved.estimatedLessonCount
        );
        await goalService.updateGoalStatus(achievedGoal.id, GoalStatusTransition.START);
        await goalService.updateGoalStatus(achievedGoal.id, GoalStatusTransition.COMPLETE, sampleGoals.achieved.context);
        goalsCreatedCount++;

      } catch (goalError) {
        console.error(`   Failed to create goals for lesson ${lessonId.substring(0, 8)}...:`, goalError);
      }
    }
    console.log(`Goals created (via service): ${goalsCreatedCount}`);
    // --- END NEW SEEDING LOGIC --- 

  } catch (e) {
    console.error("Seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('Seeding finished successfully.');
  }
}

main(); 