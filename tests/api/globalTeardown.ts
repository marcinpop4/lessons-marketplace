import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// List of tables to truncate - keep this outside the function
// IMPORTANT: Verify this list against your schema.prisma!
const tablesToTruncate = [
    "GoalStatus",
    "LessonStatus",
    "LessonQuoteStatus",
    "RefreshToken",
    "Address",
    "TeacherLessonHourlyRate",
    "Goal",
    "Lesson",
    "LessonQuote",
    "LessonRequest",
    "Student",
    "Teacher",
];

// Exported function for cleanup
export async function cleanupDatabase() {
    console.log('\n[DB Teardown] Cleaning up test database after file...');

    // --- Load Environment Variables --- (Keep inside function for safety)
    const nodeEnv = process.env.NODE_ENV || 'development';
    const envPath = path.resolve(__dirname, `../../env/.env.${nodeEnv}`);
    if (fs.existsSync(envPath)) {
        console.log(`[DB Teardown] Loading environment variables from: ${envPath}`);
        dotenv.config({ path: envPath });
    } else {
        console.warn(`[DB Teardown] Environment file not found: ${envPath}. Trying default.`);
        const defaultEnvPath = path.resolve(__dirname, '../../env/.env');
        if (fs.existsSync(defaultEnvPath)) {
            console.log(`[DB Teardown] Loading default environment variables from: ${defaultEnvPath}`);
            dotenv.config({ path: defaultEnvPath });
        }
    }
    // --- End Environment Loading ---

    // Instantiate Prisma Client inside the function
    const prisma = new PrismaClient();

    const quotedTableNames = tablesToTruncate.map(name => `\"${name}\"`).join(', ');
    const truncateCommand = `TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE;`;

    console.log(`[DB Teardown] Executing command: ${truncateCommand}`);

    try {
        const allowedEnvs = ['development', 'test'];
        if (!process.env.NODE_ENV || !allowedEnvs.includes(process.env.NODE_ENV)) {
            console.warn(`[DB Teardown] WARNING: NODE_ENV is '${process.env.NODE_ENV}'. Skipping truncation.`);
        } else {
            await prisma.$executeRawUnsafe(truncateCommand);
            console.log(`[DB Teardown] Successfully truncated tables in ${process.env.NODE_ENV} environment.`);
        }
    } catch (error) {
        console.error('[DB Teardown] Error truncating tables:', error);
    } finally {
        await prisma.$disconnect();
        console.log('[DB Teardown] Prisma client disconnected.');
    }
} 