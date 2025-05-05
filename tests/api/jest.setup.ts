import * as dotenv from 'dotenv';
// Use require for built-in Node modules in Jest setup
const path = require('path');
const fs = require('fs');



// Explicitly check if path is loaded before using it
if (!path || typeof path.resolve !== 'function') {
    console.error('[API Tests Setup] FATAL: path module not loaded correctly!');
    process.exit(1); // Exit immediately if path is not available
}

// Check if tsconfig exists - helps diagnose issues
const testTsConfigPath = path.resolve(process.cwd(), 'tests/tsconfig.test.json');
const rootTsConfigPath = path.resolve(process.cwd(), 'tsconfig.test.json');

// Assume Jest runs from the project root
const projectRoot = process.cwd();
// Determine the environment, MUST be set explicitly for the test run
const nodeEnv = process.env.NODE_ENV;

if (!nodeEnv) {
    throw new Error('[API Tests Setup] NODE_ENV environment variable is required but not set.');
}

const envFile = path.resolve(projectRoot, `env/.env.${nodeEnv}`);

const result = dotenv.config({ path: envFile });

if (result.error) {
    console.error(`[API Tests Setup] Error loading ${envFile}`, result.error);
    // Fail fast if the env file is missing/unreadable for the intended environment
    // Avoid throwing if NODE_ENV was something unexpected, only fail for api-test
    if (nodeEnv === 'api-test') {
        throw new Error(`Could not load environment file ${envFile}: ${result.error.message}`);
    }
} else {
    // Optional: Check if critical variables are loaded
    if (!process.env.DATABASE_URL) {
        // Potentially add a check here if needed, but no console output
    }
    if (!process.env.VITE_API_BASE_URL) {
        // Potentially add a check here if needed, but no console output
    }
}