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
import { LessonStatusValue } from '@shared/models/LessonStatus';

// Import ALL services 
import { teacherService } from '../teacher/teacher.service.js'; 
import { studentService } from '../student/student.service.js'; 
import { addressService } from '../address/address.service.js'; 
import { lessonRequestService } from '../lessonRequest/lessonRequest.service.js'; 
// Import the lesson quote service
import { lessonQuoteService } from '../lessonQuote/lessonQuote.service.js'; 
import { lessonService } from '../lesson/lesson.service.js'; 
import { teacherLessonHourlyRateService } from '../teacher/teacherLessonHourlyRate.service.js'; 

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
function getBaseRateInCents(lessonType) {
  switch (lessonType) {
    case LessonType.VOICE: return 5000;
    case LessonType.GUITAR: return 4500;
    case LessonType.BASS: return 4000;
    case LessonType.DRUMS: return 3500;
    default: throw new Error(`Unsupported lesson type: ${lessonType}`);
  }
}

// Helper function to add days/hours to a date
function addToDate(date, days, hours) {
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

async function main() {
  // console.log('Starting database seeding using services...');

  const commonPassword = "1234";

  try {
    // Clear existing data (using direct Prisma for seed cleanup)
    // console.log('Clearing existing data...');
    await prisma.$transaction([
      prisma.lessonStatus.deleteMany(),
      prisma.lesson.deleteMany(),
      prisma.lessonQuote.deleteMany(),
      prisma.lessonRequest.deleteMany(),
      prisma.teacherLessonHourlyRate.deleteMany(), 
      prisma.address.deleteMany(),
      prisma.teacher.deleteMany(),
      prisma.student.deleteMany(),
    ]);
    // console.log('Existing data cleared');

    // Create Teachers using TeacherService
    // console.log('Creating teachers (via service)...');
    const teacherData = [
      { firstName: 'Emily', lastName: 'Richardson', email: 'emily.richardson@musicschool.com', phoneNumber: '123-456-7890', dateOfBirth: new Date('1980-04-12') },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@musicschool.com', phoneNumber: '123-456-7891', dateOfBirth: new Date('1975-09-23') },
      { firstName: 'Sophia', lastName: 'Martinez', email: 'sophia.martinez@musicschool.com', phoneNumber: '123-456-7892', dateOfBirth: new Date('1982-11-05') },
      { firstName: 'James', lastName: 'Wilson', email: 'james.wilson@musicschool.com', phoneNumber: '123-456-7893', dateOfBirth: new Date('1978-06-18') },
      { firstName: 'Olivia', lastName: 'Thompson', email: 'olivia.thompson@musicschool.com', phoneNumber: '123-456-7894', dateOfBirth: new Date('1985-02-27') }
    ];
    
    const teachers = await Promise.all(
      teacherData.map(teacher => teacherService.create(prisma, { ...teacher, password: commonPassword })) 
    );
    console.log('Teachers created (via service):', teachers.length);

    // Get Emily Richardson's teacher record (for tests)
    const emilyRichardson = teachers.find(teacher => teacher.email === 'emily.richardson@musicschool.com');
    if (!emilyRichardson) {
      throw new Error('Emily Richardson teacher record not found');
    }
    // console.log('Found Emily Richardson teacher record for tests:', emilyRichardson.id);
    
    // Create Students using StudentService
    // console.log('Creating students (via service)...');
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
      studentData.map(student => studentService.create(prisma, { ...student, password: commonPassword }))
    );
    console.log('Students created (via service):', students.length);

    // Create Addresses using AddressService
    // console.log('Creating addresses (via service)...');
    const addresses = await Promise.all(
      sampleAddresses.map(addressData => addressService.create(prisma, addressData))
    );
    console.log('Addresses created (via service):', addresses.length);

    // Create Hourly Rates using TeacherLessonHourlyRateService
    // console.log('Creating hourly rates (via service)...');
    const teacherLessonHourlyRates = [];
    for (const teacher of teachers) {
      const teacherRates = await Promise.all(
        Object.values(LessonType).map(async (lessonType) => {
          const baseRateInCents = getBaseRateInCents(lessonType);
          const rateVariationInCents = Math.floor(Math.random() * 10) * 500;
          const rateInCents = baseRateInCents + rateVariationInCents;
          
          return teacherLessonHourlyRateService.create(prisma, {
            teacherId: teacher.id, // Pass teacherId here as expected by the service
            type: lessonType,
            rateInCents: rateInCents,
          });
        })
      );
      teacherLessonHourlyRates.push(...teacherRates);
    }
    console.log('TeacherLessonHourlyRates created (via service):', teacherLessonHourlyRates.length);

    // Create Lesson Requests using LessonRequestService
    // console.log('Creating lesson requests (via service)...');
    const lessonRequests = [];
    const lessonTypes = Object.values(LessonType);
    const today = new Date();
    
    // Create at least 15 lesson requests (for Emily's quotes)
    const numLessonRequests = 20; // Create a few extra to be safe
    
    for (let i = 0; i < numLessonRequests; i++) {
      const student = students[i % students.length];
      const lessonType = lessonTypes[i % lessonTypes.length];
      const address = addresses[i % addresses.length];
      const startTime = addToDate(today, Math.floor(i / 4), 9 + (i % 8));
      
      // Pass data matching CreateLessonRequestDTO (no prisma arg, use addressObj)
      const request = await lessonRequestService.createLessonRequest({ 
        studentId: student.id,
        // Construct addressObj from the address created earlier
        addressObj: {
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
      lessonRequests.push(request);
    }
    console.log('LessonRequests created (via service):', lessonRequests.length);

    // Create Lesson Quotes using LessonQuoteService - specifically for Emily Richardson
    // console.log('Creating lesson quotes for Emily Richardson (via service)...');
    const emilyQuotes = [];
    
    // Get Emily's hourly rates
    const emilyHourlyRates = teacherLessonHourlyRates.filter(rate => rate.teacherId === emilyRichardson.id);
    
    // Ensure we have at least 15 lesson requests
    if (lessonRequests.length < 15) {
      throw new Error(`Not enough lesson requests for Emily's quotes. Need at least 15, got ${lessonRequests.length}.`);
    }
    
    // Create exactly 15 quotes for Emily, one for each of the first 15 lesson requests
    for (let i = 0; i < 15; i++) {
      const request = lessonRequests[i];
      
      // Find Emily's rate for this lesson type
      const hourlyRate = emilyHourlyRates.find(rate => rate.type === request.type);
      
      if (!hourlyRate) {
        throw new Error(`No hourly rate found for Emily for lesson type ${request.type}`);
      }
      
      const costInCents = Math.round((hourlyRate.rateInCents * request.durationMinutes) / 60);
      
      const quote = await lessonQuoteService.create(prisma, { 
        lessonRequestId: request.id,
        teacherId: emilyRichardson.id,  // Always use Emily's ID
        costInCents,
        hourlyRateInCents: hourlyRate.rateInCents,
      });
      
      emilyQuotes.push(quote);
    }
    
    // Create additional quotes for other teachers (optional)
    const otherQuotes = [];
    for (const request of lessonRequests) {
      // Skip the first 15 requests (already used for Emily)
      if (lessonRequests.indexOf(request) < 15) {
        continue;
      }
      
      // Find a different teacher (not Emily)
      const otherTeachers = teachers.filter(t => t.id !== emilyRichardson.id);
      const teacher = otherTeachers[Math.floor(Math.random() * otherTeachers.length)];
      
      const hourlyRate = teacherLessonHourlyRates.find(
          rate => rate.teacherId === teacher.id && rate.type === request.type
      );
      
      if (hourlyRate) {
        const costInCents = Math.round((hourlyRate.rateInCents * request.durationMinutes) / 60);
        
        const quote = await lessonQuoteService.create(prisma, { 
          lessonRequestId: request.id,
          teacherId: teacher.id,
          costInCents,
          hourlyRateInCents: hourlyRate.rateInCents,
        });
        otherQuotes.push(quote);
      }
    }
    
    // Combine all quotes
    const lessonQuotes = [...emilyQuotes, ...otherQuotes];
    console.log('Total lesson quotes created:', lessonQuotes.length);

    // Create Lessons and Statuses using LessonService
    // console.log('Creating lessons for Emily Richardson (via service)...');
    const lessons = [];
    
    // Create 3 REQUESTED lessons for Emily
    for (let i = 0; i < 3; i++) {
        const lesson = await lessonService.create(prisma, emilyQuotes[i].id);
        lessons.push(lesson);
    }
    
    // Create 3 ACCEPTED lessons for Emily
    for (let i = 3; i < 6; i++) {
        const lesson = await lessonService.create(prisma, emilyQuotes[i].id);
        await lessonService.updateStatus(
            prisma, 
            lesson.id, 
            LessonStatusValue.ACCEPTED, 
            { acceptedByTeacherId: emilyRichardson.id }
        );
        lessons.push(lesson);
    }
    
    // Create 3 COMPLETED lessons for Emily
    for (let i = 6; i < 9; i++) {
        const lesson = await lessonService.create(prisma, emilyQuotes[i].id);
        await lessonService.updateStatus(
            prisma, 
            lesson.id, 
            LessonStatusValue.ACCEPTED, 
            { acceptedByTeacherId: emilyRichardson.id }
        );
        await lessonService.updateStatus(
            prisma, 
            lesson.id, 
            LessonStatusValue.COMPLETED, 
            { completedByTeacherId: emilyRichardson.id }
        );
        lessons.push(lesson);
    }
    
    // Create 3 REJECTED lessons for Emily
    for (let i = 9; i < 12; i++) {
        const lesson = await lessonService.create(prisma, emilyQuotes[i].id);
        await lessonService.updateStatus(
            prisma, 
            lesson.id, 
            LessonStatusValue.REJECTED, 
            { rejectedByTeacherId: emilyRichardson.id, reason: 'Scheduling conflict' }
        );
        lessons.push(lesson);
    }
    
    // Create 3 VOIDED lessons for Emily
    for (let i = 12; i < 15; i++) {
        const lesson = await lessonService.create(prisma, emilyQuotes[i].id);
        await lessonService.updateStatus(
            prisma, 
            lesson.id, 
            LessonStatusValue.ACCEPTED, 
            { acceptedByTeacherId: emilyRichardson.id }
        );
        await lessonService.updateStatus(
            prisma, 
            lesson.id, 
            LessonStatusValue.VOIDED, 
            { voidedByTeacherId: emilyRichardson.id, reason: 'Student requested cancellation' }
        );
        lessons.push(lesson);
    }
    
    console.log('Lessons created for Emily Richardson:', lessons.length);
    // console.log('Seeding completed successfully using services!');

  } catch (error) {
    console.error('Error during service-based seeding:', error);
    throw error;
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