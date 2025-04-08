/**
 * Script to backfill lesson statuses for existing lessons
 * 
 * This should be run after the migration that adds the LessonStatus table
 * but before making the currentStatusId field non-nullable
 */

import pkg from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFile = path.resolve(__dirname, `../env/.env.${process.env.NODE_ENV}`);

if (!process.env.NODE_ENV) {
  throw new Error('NODE_ENV environment variable is required');
}

const result = dotenv.config({ path: envFile });
if (result.error) {
  throw new Error(`Failed to load environment file at ${envFile}: ${result.error.message}`);
}

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function backfillLessonStatuses() {
  console.log('Starting status backfill process...');
  
  try {
    // Get all lessons without a currentStatusId
    const lessonsWithoutStatus = await prisma.lesson.findMany({
      where: {
        currentStatusId: null
      },
      include: {
        quote: true
      }
    });

    console.log(`Found ${lessonsWithoutStatus.length} lessons without a status`);
    
    if (lessonsWithoutStatus.length === 0) {
      console.log('No lessons need backfilling. Process complete.');
      return;
    }

    // Process each lesson and create a status for it
    let successCount = 0;
    let errorCount = 0;

    for (const lesson of lessonsWithoutStatus) {
      try {
        // Create a new status record
        const statusId = uuidv4();
        const status = await prisma.lessonStatus.create({
          data: {
            id: statusId,
            lessonId: lesson.id,
            status: 'REQUESTED', // Default initial status
            context: {},
            createdAt: lesson.confirmedAt // Use the lesson's confirmation date
          }
        });
        
        // Update the lesson with the new status ID
        await prisma.lesson.update({
          where: {
            id: lesson.id
          },
          data: {
            currentStatusId: statusId
          }
        });
        
        successCount++;
      } catch (error) {
        console.error(`Error processing lesson ${lesson.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Backfill complete: ${successCount} successful, ${errorCount} failed`);
    
  } catch (error) {
    console.error('Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backfillLessonStatuses()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 