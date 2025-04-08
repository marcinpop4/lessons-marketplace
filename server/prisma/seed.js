/**
 * Prisma Seed Script
 * 
 * This script seeds the database with initial data for development and testing.
 * 
 * IMPORTANT NOTES:
 * - This file is intentionally JavaScript rather than TypeScript for better compatibility
 *   with Prisma's migration and seeding systems, especially in Docker environments.
 * - Enums are defined directly in this file rather than imported from TypeScript models
 *   to avoid module resolution issues across different environments.
 * - If you modify the enums in the TypeScript models, be sure to update them here as well.
 */

import pkg from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
/* 
 * IMPORTANT: ES Module imports require .js extension even for TypeScript files
 * This is particularly important for Docker environments where module resolution is strict.
 * Local development with tsx may work without extensions, but Docker will fail.
 */

/* 
 * DUPLICATED ENUMS FOR DOCKER COMPATIBILITY
 * 
 * These enums duplicate the TypeScript enums from:
 * - shared/models/LessonType.ts
 * - shared/models/LessonStatus.ts
 * 
 * This duplication is necessary because:
 * 1. Docker's ES Module environment strictly enforces import paths
 * 2. TypeScript files are not directly available in compiled environments
 * 3. Path resolution works differently across environments
 *
 * If you modify the original TypeScript enums, make sure to keep
 * these duplicates in sync.
 */
// Duplicated from shared/models/LessonType.ts
const LessonType = {
  VOICE: "VOICE",
  GUITAR: "GUITAR",
  BASS: "BASS",
  DRUMS: "DRUMS"
};

// Duplicated from shared/models/LessonStatus.ts 
const LessonStatusValue = {
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  STARTED: 'STARTED',
  COMPLETED: 'COMPLETED',
  INCOMPLETE: 'INCOMPLETE'
};

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

const { PrismaClient } = pkg;

// Initialize Prisma client
const prisma = new PrismaClient();

// Ensure Prisma client is initialized before running the seed
async function ensurePrismaClientIsInitialized() {
  try {
    // Test a simple database query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Prisma client is initialized and connected to the database');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Database connection failed. Make sure the database container is running and accessible at ${process.env.DATABASE_URL}`);
    }
    
    console.error('❌ Prisma client is not initialized properly');
    console.error('Attempting to generate Prisma client...');
    
    try {
      execSync('npx prisma generate --schema=server/prisma/schema.prisma', { stdio: 'inherit' });
      console.log('Prisma client generation completed');
      
      // Test connection again
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ Prisma client is now properly initialized');
      return true;
    } catch (generateError) {
      if (generateError.code === 'ECONNREFUSED') {
        throw new Error(`Database connection failed. Make sure the database container is running and accessible at ${process.env.DATABASE_URL}`);
      }
      throw new Error(`Failed to initialize Prisma client: ${generateError.message}`);
    }
  }
}

// Function to get base rate by lesson type (in cents)
function getBaseRateInCents(lessonType) {
  switch (lessonType) {
    case LessonType.VOICE:
      return 5000; // $50.00
    case LessonType.GUITAR:
      return 4500; // $45.00
    case LessonType.BASS:
      return 4000; // $40.00
    case LessonType.DRUMS:
      return 3500; // $35.00
    default:
      throw new Error(`Unsupported lesson type: ${lessonType}`);
  }
}

// Helper function to add days/hours to a date
function addToDate(date, days, hours) {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

// Hash password function
async function hashPassword(password) {
  const saltRounds = 10;
  return bcryptjs.hash(password, saltRounds);
}

// Sample addresses for lessons
const sampleAddresses = [
  {
    street: '123 Main Street',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA'
  },
  {
    street: '456 Oak Avenue',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90001',
    country: 'USA'
  },
  {
    street: '789 Pine Boulevard',
    city: 'Chicago',
    state: 'IL',
    postalCode: '60601',
    country: 'USA'
  },
  {
    street: '101 Maple Drive',
    city: 'Houston',
    state: 'TX',
    postalCode: '77001',
    country: 'USA'
  },
  {
    street: '202 Cedar Lane',
    city: 'Miami',
    state: 'FL',
    postalCode: '33101',
    country: 'USA'
  }
];

async function main() {
  console.log('Starting database seeding...');

  // Ensure Prisma client is initialized before proceeding
  const isPrismaInitialized = await ensurePrismaClientIsInitialized();
  if (!isPrismaInitialized) {
    throw new Error('Failed to initialize Prisma client. Cannot proceed with seeding.');
  }

  // Hash the common password "1234" once 
  const hashedPassword = await hashPassword("1234");

  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.$transaction([
      prisma.lessonStatus.deleteMany(),
      prisma.lesson.deleteMany(),
      prisma.lessonQuote.deleteMany(),
      prisma.lessonRequest.deleteMany(),
      prisma.address.deleteMany(),
      prisma.teacherLessonHourlyRate.deleteMany(),
      prisma.teacher.deleteMany(),
      prisma.student.deleteMany(),
    ]);
    
    console.log('Existing data cleared');

    // Create 5 teachers with believable names
    console.log('Creating teachers...');
    const teacherData = [
      { firstName: 'Emily', lastName: 'Richardson', email: 'emily.richardson@musicschool.com', phoneNumber: '123-456-7890', dateOfBirth: new Date('1980-04-12') },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@musicschool.com', phoneNumber: '123-456-7891', dateOfBirth: new Date('1975-09-23') },
      { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia.martinez@musicschool.com', phoneNumber: '123-456-7892', dateOfBirth: new Date('1982-11-05') },
      { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@musicschool.com', phoneNumber: '123-456-7893', dateOfBirth: new Date('1978-06-18') },
      { firstName: 'Olivia', lastName: 'Thompson', email: 'olivia.thompson@musicschool.com', phoneNumber: '123-456-7894', dateOfBirth: new Date('1985-02-27') }
    ];
    
    const teachers = await Promise.all(
      teacherData.map(async (teacher) => {
        return prisma.teacher.create({
          data: {
            ...teacher,
            password: hashedPassword,
            authMethods: ['PASSWORD'],
            isActive: true
          }
        });
      })
    );

    console.log('Teachers created:', teachers.length);

    // Create 10 students with believable names
    console.log('Creating students...');
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
    
    const students = await Promise.all(
      studentData.map(async (student) => {
        return prisma.student.create({
          data: {
            ...student,
            password: hashedPassword,
            authMethods: ['PASSWORD'],
            isActive: true
          }
        });
      })
    );

    console.log('Students created:', students.length);

    // Create hourly rates for each teacher (one rate per lesson type)
    console.log('Creating hourly rates...');
    const teacherLessonHourlyRates = [];
    for (const teacher of teachers) {
      const teacherRates = await Promise.all(
        Object.values(LessonType).map(async (lessonType) => {
          // Get base rate for this lesson type (in cents)
          const baseRateInCents = getBaseRateInCents(lessonType);
          
          // Adding some variation to rates to make them more realistic (in cents)
          // Each increment is $5.00 (500 cents) and we add 0-9 increments randomly
          const rateVariationInCents = Math.floor(Math.random() * 10) * 500;
          const rateInCents = baseRateInCents + rateVariationInCents;
          
          // Create a TeacherLessonHourlyRate record in the database
          return prisma.teacherLessonHourlyRate.create({
            data: {
              teacherId: teacher.id,
              type: lessonType,
              rateInCents: rateInCents, // Storing rate in cents
            },
          });
        })
      );
      teacherLessonHourlyRates.push(...teacherRates);
    }

    console.log('TeacherLessonHourlyRates created:', teacherLessonHourlyRates.length);

    // Create addresses for lesson locations
    console.log('Creating addresses...');
    const addresses = await Promise.all(
      sampleAddresses.map(addressData => 
        prisma.address.create({
          data: addressData
        })
      )
    );
    console.log('Addresses created:', addresses.length);

    // Create 20 lesson requests, quotes, and some confirmed lessons
    console.log('Creating lesson requests, quotes, and lessons...');
    const lessonTypes = Object.values(LessonType);
    const today = new Date();
    
    // Student lesson requests
    const lessonRequests = [];
    for (let i = 0; i < 20; i++) {
      const student = students[i % students.length];
      const lessonType = lessonTypes[i % lessonTypes.length];
      const address = addresses[i % addresses.length];
      
      // Create lesson requests at different times over the next 30 days
      const startTime = addToDate(today, Math.floor(i / 4), 9 + (i % 8)); // Lessons between 9am and 5pm
      
      const lessonRequest = await prisma.lessonRequest.create({
        data: {
          type: lessonType,
          startTime,
          durationMinutes: 60, // 1-hour lessons
          address: {
            connect: { id: address.id }
          },
          student: {
            connect: { id: student.id }
          }
        },
      });
      
      lessonRequests.push(lessonRequest);
    }

    console.log('LessonRequests created:', lessonRequests.length);

    // Teacher quotes for lesson requests
    const lessonQuotes = [];
    for (const request of lessonRequests) {
      // For each request, get 1-3 random teachers to provide quotes
      const quotesPerRequest = Math.floor(Math.random() * 3) + 1;
      const shuffledTeachers = [...teachers].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < quotesPerRequest && i < shuffledTeachers.length; i++) {
        const teacher = shuffledTeachers[i];
        
        // Get the hourly rate for this teacher and lesson type
        const hourlyRate = await prisma.teacherLessonHourlyRate.findFirst({
          where: {
            teacherId: teacher.id,
            type: request.type,
          },
        });
        
        if (hourlyRate) {
          // Calculate cost based on hourly rate and duration
          const costInCents = Math.round((hourlyRate.rateInCents * request.durationMinutes) / 60);
          
          // Create expiration date (48 hours from now)
          const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
          
          const quote = await prisma.lessonQuote.create({
            data: {
              costInCents,
              expiresAt,
              lessonRequestId: request.id,
              teacherId: teacher.id,
            },
          });
          
          lessonQuotes.push(quote);
        }
      }
    }

    console.log('LessonQuotes created:', lessonQuotes.length);

    // Convert some quotes to confirmed lessons (about half)
    const lessons = [];
    const confirmedQuotes = lessonQuotes.filter((_, idx) => idx % 2 === 0);
    
    for (const quote of confirmedQuotes) {
      const lesson = await prisma.lesson.create({
        data: {
          quoteId: quote.id,
          // confirmedAt is automatically set to current timestamp
        },
      });
      
      // Create initial REQUESTED status for the lesson
      const statusId = uuidv4();
      const lessonStatus = await prisma.lessonStatus.create({
        data: {
          id: statusId,
          lessonId: lesson.id,
          status: LessonStatusValue.REQUESTED,
          context: {},
          createdAt: lesson.confirmedAt
        }
      });
      
      // Update the lesson with the status ID
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { currentStatusId: statusId }
      });
      
      lessons.push(lesson);
    }

    console.log('Lessons created:', lessons.length);
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error; // Re-throw to ensure the process exits with an error code
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 