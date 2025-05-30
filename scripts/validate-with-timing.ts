#!/usr/bin/env tsx

import { execa } from 'execa';
import { ChildProcess } from 'child_process';
// @ts-ignore - Suppressing persistent type error despite @types/wait-on installation
import waitOn from 'wait-on';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createChildLogger } from '../config/logger.js';

// Create child logger for validation script
const logger = createChildLogger('validation-script');

// Determine the root directory based on script location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..'); // Assumes script is in ./scripts

// Load environment variables from .env.development
dotenv.config({ path: path.resolve(projectRoot, 'env', '.env.development') });

// --- Environment Variable Checks ---
const requiredEnvVars = ['PORT', 'FRONTEND_HOST', 'FRONTEND_PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(
        chalk.red(
            `Error: Missing required environment variables: ${missingEnvVars.join(', ')}. ` +
            `Please ensure they are defined in env/.env.development`
        )
    );
    process.exit(1);
}

// Set environment correctly
process.env.NODE_ENV = 'development';

const SERVER_PORT = process.env.PORT!;
const FRONTEND_HOST = process.env.FRONTEND_HOST!;
const FRONTEND_PORT = process.env.FRONTEND_PORT!;
const FRONTEND_URL = `${FRONTEND_HOST}:${FRONTEND_PORT}`;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Base environment for child processes
const baseEnv = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    SILENCE_PRISMA_EXPECTED_ERRORS: 'true',
    // Suppress console logs during tests unless explicitly requested
    SHOW_TEST_LOGS: process.env.SHOW_TEST_LOGS || 'false'
};

interface Step {
    name: string;
    command: string;
}

const setupSteps: Step[] = [
    { name: 'Clean', command: 'pnpm clean' },
    { name: 'Install', command: 'pnpm install' },
    { name: 'Database Setup', command: 'pnpm prisma:drop-create-db' },
    { name: 'Database Migrate', command: 'pnpm prisma:migrate' },
    { name: 'Prisma Generate', command: 'pnpm prisma:generate' },
    { name: 'Database Seed', command: 'pnpm prisma:seed' },
    { name: 'TypeScript Diagnosis', command: 'pnpm diagnose:ts' }
];

// Store background processes
let serverProcess: any | null = null;
let frontendProcess: any | null = null;

function formatDuration(duration: number): string {
    return `${(duration / 1000).toFixed(2)}s`;
}

async function runSetupStep(step: Step): Promise<number> {
    logger.info(`\nRunning: ${step.name}`);
    const startTime = Date.now();

    try {
        await execa(step.command, { shell: true, stdio: 'inherit' });
        const endTime = Date.now();
        return endTime - startTime;
    } catch (error) {
        logger.error(`Error in step ${step.name}:`, error);
        process.exit(1);
    }
}

async function runTestCommand(
    command: string,
    args: string[],
    title: string
): Promise<{ duration: number; failed: boolean }> {
    const startTime = Date.now();
    logger.info(`\n---> Running: ${title} (${command} ${args.join(' ')})...`);

    try {
        const subprocess = execa(command, args, {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: baseEnv,
        });
        const result = await subprocess;
        const endTime = Date.now();
        logger.info(`---> Finished: ${title} (Success)`);
        return { duration: endTime - startTime, failed: false };
    } catch (error: any) {
        const endTime = Date.now();
        logger.error(`---> Failed: ${title}`);
        return { duration: endTime - startTime, failed: true };
    }
}

// Function to kill background processes gracefully
const killProcesses = async () => {
    const killPromises: Promise<any>[] = [];
    if (serverProcess && !serverProcess.killed) {
        logger.warn('Attempting to kill server process...');
        serverProcess.kill('SIGTERM');
        killPromises.push(serverProcess.catch((e: Error) => logger.error('Error killing server process:', e.message)));
    }
    if (frontendProcess && !frontendProcess.killed) {
        logger.warn('Attempting to kill frontend process...');
        frontendProcess.kill('SIGTERM');
        killPromises.push(frontendProcess.catch((e: Error) => logger.error('Error killing frontend process:', e.message)));
    }
    await Promise.allSettled(killPromises);
    logger.warn('Background processes cleanup attempted.');
};

async function runTests(): Promise<{ unitTime: number; apiTime: number; e2eTime: number; failed: boolean }> {
    let finalExitCode = 0;

    // Trap exit signals to ensure cleanup
    const cleanupAndExit = async (signal: NodeJS.Signals) => {
        logger.warn(`\nReceived ${signal}. Cleaning up...`);
        await killProcesses();
        process.exit(1);
    };
    process.on('SIGINT', () => cleanupAndExit('SIGINT'));
    process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));

    try {
        // 1. Run Unit Tests
        const unitResult = await runTestCommand('pnpm', ['test:unit'], 'Unit Tests');
        if (unitResult.failed) {
            finalExitCode = 1;
            logger.error('Unit tests failed. Stopping validation.');
            return {
                unitTime: unitResult.duration,
                apiTime: 0,
                e2eTime: 0,
                failed: true
            };
        }

        // 2. Start Server and Frontend in background
        logger.info(`\n---> Starting background services...`);
        const servicesStartTime = Date.now();

        serverProcess = execa('pnpm', ['run', 'dev:server:no-watch'], { stdio: ['inherit', 'inherit', 'ignore'], env: baseEnv });
        const frontendEnv = { ...baseEnv, DISABLE_VITE_PROXY_LOGS: 'true' };
        frontendProcess = execa('pnpm', ['run', 'dev:frontend'], { stdio: 'inherit', env: frontendEnv });

        // Handle potential early exit of background processes
        serverProcess.catch((e: Error) => {
            if (!serverProcess?.killed) logger.error('Server process exited unexpectedly:', e.message);
        });
        frontendProcess.catch((e: Error) => {
            if (!frontendProcess?.killed) logger.error('Frontend process exited unexpectedly:', e.message);
        });

        // 3. Wait for services
        logger.info(`\n---> Waiting for services (Server: ${SERVER_URL}, Frontend: ${FRONTEND_URL})...`);
        try {
            await waitOn({
                resources: [
                    `tcp:${SERVER_PORT}`,
                    FRONTEND_URL
                ],
                timeout: 180000,
                log: true,
                validateStatus: function (status: number) {
                    return status >= 200 && status < 400;
                },
            });
            const servicesEndTime = Date.now();
            const servicesDuration = servicesEndTime - servicesStartTime;
            logger.info(`Services are ready (took ${formatDuration(servicesDuration)}).`);
        } catch (err) {
            logger.error('Services did not start in time.', err);
            throw new Error('Services failed to start');
        }

        // 4. Run API Tests
        const apiResult = await runTestCommand('pnpm', ['test:api'], 'API Tests');
        if (apiResult.failed) {
            finalExitCode = 1;
            logger.error('API tests failed. Stopping validation.');
            await killProcesses();
            return {
                unitTime: unitResult.duration,
                apiTime: apiResult.duration,
                e2eTime: 0,
                failed: true
            };
        }

        // 5. Run E2E Tests
        const e2eResult = await runTestCommand('pnpm', ['test:e2e'], 'E2E Tests');
        if (e2eResult.failed) {
            finalExitCode = 1;
            logger.error('E2E tests failed.');
        }

        // Cleanup background processes
        await killProcesses();

        return {
            unitTime: unitResult.duration,
            apiTime: apiResult.duration,
            e2eTime: e2eResult.duration,
            failed: finalExitCode !== 0
        };

    } catch (error: any) {
        logger.error(`\n--- An error occurred during test execution ---`);
        await killProcesses();
        return {
            unitTime: 0,
            apiTime: 0,
            e2eTime: 0,
            failed: true
        };
    }
}

async function main() {
    logger.info('Starting validation process...\n');

    const setupTimings: { name: string; duration: number }[] = [];
    let setupTime = 0;

    // Run setup steps
    for (const step of setupSteps) {
        const duration = await runSetupStep(step);
        setupTimings.push({ name: step.name, duration });
        setupTime += duration;
    }

    // Run tests
    const testResults = await runTests();
    const testTime = testResults.unitTime + testResults.apiTime + testResults.e2eTime;
    const totalTime = setupTime + testTime;

    // Print timing report
    logger.info('\n=== Validation Timing Report ===');

    // Setup steps
    logger.info('\nSetup steps:');
    setupTimings.forEach(({ name, duration }) => {
        logger.info(`${name}: ${formatDuration(duration)}`);
    });
    logger.info(`Total setup time: ${formatDuration(setupTime)}`);

    // Test execution
    logger.info('\nTest execution:');
    logger.info(`Unit tests: ${formatDuration(testResults.unitTime)}`);
    logger.info(`API tests: ${formatDuration(testResults.apiTime)}`);
    logger.info(`E2E tests: ${formatDuration(testResults.e2eTime)}`);
    logger.info(`Total test time: ${formatDuration(testTime)}`);

    // Overall summary
    logger.info('\nOverall summary:');
    logger.info(`Total execution time: ${formatDuration(totalTime)}`);

    if (testResults.failed) {
        logger.error('\n❌ Validation failed.');
        process.exit(1);
    } else {
        logger.info('\n✅ Validation completed successfully!');
    }
}

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 