import * as dotenv from 'dotenv';
import * as path from 'path';

// Assume Jest runs from the project root
const projectRoot = process.cwd();
// Determine the environment, MUST be set explicitly for the test run
const nodeEnv = process.env.NODE_ENV;

if (!nodeEnv) {
    throw new Error('[Jest Setup API] NODE_ENV environment variable is required but not set.');
}

const envFile = path.resolve(projectRoot, `env/.env.${nodeEnv}`);

console.log(`[Jest Setup API - ${__filename}] Attempting to load environment variables from: ${envFile}`);

const result = dotenv.config({ path: envFile });

if (result.error) {
    console.error(`[Jest Setup API] Error loading ${envFile}`, result.error);
    // Fail fast if the env file is missing/unreadable for the intended environment
    // Avoid throwing if NODE_ENV was something unexpected, only fail for api-test
    if (nodeEnv === 'api-test') {
        throw new Error(`Could not load environment file ${envFile}: ${result.error.message}`);
    }
} else {
    // Optional: Check if critical variables are loaded
    if (!process.env.DATABASE_URL) {
        console.warn(`[Jest Setup API] Warning: DATABASE_URL not found in ${envFile}`);
    }
    if (!process.env.VITE_API_BASE_URL) {
        console.warn(`[Jest Setup API] Warning: VITE_API_BASE_URL not found in ${envFile}`);
    }
    console.log(`[Jest Setup API] Successfully loaded ${envFile}. VITE_API_BASE_URL=${process.env.VITE_API_BASE_URL}`);
} 