#!/usr/bin/env tsx

/**
 * Docker Validation Script with Timing
 * 
 * This script validates the entire Docker environment by building/starting services,
 * running all test suites, and reporting detailed timing information.
 * 
 * Usage:
 *   pnpm tsx scripts/validate-with-timing.ts [--fast] [--env=<environment>]
 *   
 * Options:
 *   --fast               Skip Docker image rebuilding (faster, but may miss build issues)
 *   --env=<environment>  Specify environment (development|test|production)
 *                       Defaults to NODE_ENV or 'development'
 * 
 * Examples:
 *   pnpm tsx scripts/validate-with-timing.ts
 *   pnpm tsx scripts/validate-with-timing.ts --fast
 *   pnpm tsx scripts/validate-with-timing.ts --env=test
 *   pnpm tsx scripts/validate-with-timing.ts --fast --env=test
 *   NODE_ENV=test pnpm tsx scripts/validate-with-timing.ts --fast
 */

import { execa } from 'execa';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createChildLogger } from '../config/logger.js';
import fs from 'fs';

// Determine the root directory based on script location
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..'); // Assumes script is in ./scripts

// Parse command line arguments for environment
function parseArguments() {
    const args = process.argv.slice(2);
    let nodeEnv = process.env.NODE_ENV || 'development';
    let fastMode = false;

    for (const arg of args) {
        if (arg === '--fast') {
            fastMode = true;
        } else if (arg.startsWith('--env=')) {
            nodeEnv = arg.split('=')[1];
        } else if (arg.startsWith('--NODE_ENV=')) {
            nodeEnv = arg.split('=')[1];
        }
    }

    return { nodeEnv, fastMode };
}

const { nodeEnv, fastMode } = parseArguments();

// Validate environment
const validEnvironments = ['development', 'test', 'production'];
if (!validEnvironments.includes(nodeEnv)) {
    console.error(`❌ Invalid NODE_ENV: ${nodeEnv}. Must be one of: ${validEnvironments.join(', ')}`);
    process.exit(1);
}

// Load environment variables from appropriate .env file
const envFilePath = path.resolve(projectRoot, 'env', `.env.${nodeEnv}`);
if (!fs.existsSync(envFilePath)) {
    console.error(`❌ Environment file not found: ${envFilePath}`);
    process.exit(1);
}

dotenv.config({ path: envFilePath });

// Set environment correctly
process.env.NODE_ENV = nodeEnv;

// Create child logger for validation script
const logger = createChildLogger('validation-script');

// Check if fast mode is enabled (skip Docker build)
const FAST_MODE = fastMode;

// Base environment for child processes
const baseEnv = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    SILENCE_PRISMA_EXPECTED_ERRORS: 'true',
    NODE_ENV: nodeEnv,
};

interface Step {
    name: string;
    command: string;
}

async function checkIfRebuildNeeded(): Promise<string[]> {
    const reasons: string[] = [];

    try {
        // Check if Docker images exist
        const { stdout } = await execa('docker', ['images', '-q', 'docker-server'], { env: baseEnv });
        if (!stdout.trim()) {
            reasons.push('Docker images not found');
        }
    } catch (error) {
        reasons.push('Cannot check Docker images');
    }

    // Check for uncommitted changes to key build files
    const buildCriticalFiles = [
        'package.json',
        'pnpm-lock.yaml',
        'docker/',
        'tsconfig.json',
        'server/prisma/schema.prisma'
    ];

    try {
        // Check for modified files (both staged and unstaged)
        const { stdout: statusOutput } = await execa('git', ['status', '--porcelain'], { env: baseEnv });

        if (statusOutput.trim()) {
            const modifiedFiles = statusOutput.split('\n').map(line => line.slice(3)); // Remove git status prefix

            for (const criticalPath of buildCriticalFiles) {
                const hasChanges = modifiedFiles.some(file =>
                    file.startsWith(criticalPath) || file === criticalPath
                );

                if (hasChanges) {
                    const changedFiles = modifiedFiles.filter(file =>
                        file.startsWith(criticalPath) || file === criticalPath
                    );
                    reasons.push(`Uncommitted changes in ${criticalPath}: ${changedFiles.join(', ')}`);
                }
            }
        }

        // Also check if we're on a different commit than last build
        // (This would require storing the commit hash somewhere, but for now we'll skip this)

    } catch (error) {
        reasons.push('Cannot check git status - not in a git repository?');
    }

    return reasons;
}

const setupSteps: Step[] = FAST_MODE ? [
    { name: 'Clean Docker Environment', command: 'pnpm dev:clean' },
    { name: 'Start Services', command: 'pnpm dev:up' },
    { name: 'Install Dependencies', command: 'pnpm dev:install' },
    { name: 'Generate Prisma Client', command: 'pnpm prisma:generate' },
    { name: 'Setup Database', command: 'pnpm prisma:setup' },
    { name: 'Diagnose TypeScript', command: 'pnpm diagnose:ts' },
] : [
    { name: 'Clean Docker Environment', command: 'pnpm dev:clean' },
    { name: 'Build Docker Images', command: 'pnpm dev:build' },
    { name: 'Start Services', command: 'pnpm dev:up' },
    { name: 'Install Dependencies', command: 'pnpm dev:install' },
    { name: 'Generate Prisma Client', command: 'pnpm prisma:generate' },
    { name: 'Setup Database', command: 'pnpm prisma:setup' },
    { name: 'Diagnose TypeScript', command: 'pnpm diagnose:ts' },
];

function formatDuration(duration: number): string {
    return `${(duration / 1000).toFixed(2)}s`;
}

async function runSetupStep(step: Step): Promise<number> {
    logger.info(`Running: ${step.name}`);
    const startTime = Date.now();

    try {
        await execa(step.command, { shell: true, stdio: 'inherit', env: baseEnv });
        const endTime = Date.now();
        return endTime - startTime;
    } catch (error) {
        logger.error(`Error in step ${step.name}:`, error);
        process.exit(1);
    }
}

async function runTestCommand(
    command: string,
    title: string
): Promise<{ duration: number; failed: boolean }> {
    const startTime = Date.now();
    logger.info(`---> Running: ${title} (${command})...`);

    try {
        await execa(command, { shell: true, stdio: 'inherit', env: baseEnv });
        const endTime = Date.now();
        logger.info(`---> Finished: ${title} (Success)`);
        return { duration: endTime - startTime, failed: false };
    } catch (error: any) {
        const endTime = Date.now();
        logger.error(`---> Failed: ${title}`);
        return { duration: endTime - startTime, failed: true };
    }
}

async function runTests(): Promise<{ unitTime: number; apiTime: number; e2eTime: number; failed: boolean }> {
    try {
        // Run each test suite separately to get accurate timing
        logger.info('---> Running individual test suites...');

        // 1. Unit Tests
        const unitResult = await runTestCommand(
            'pnpm test:unit',
            'Unit Tests'
        );

        if (unitResult.failed) {
            logger.error('Unit tests failed. Stopping validation.');
            return {
                unitTime: unitResult.duration,
                apiTime: 0,
                e2eTime: 0,
                failed: true
            };
        }

        // 2. API Tests
        const apiResult = await runTestCommand(
            'pnpm test:api',
            'API Tests'
        );

        if (apiResult.failed) {
            logger.error('API tests failed. Stopping validation.');
            return {
                unitTime: unitResult.duration,
                apiTime: apiResult.duration,
                e2eTime: 0,
                failed: true
            };
        }

        // 3. E2E Tests
        const e2eResult = await runTestCommand(
            'pnpm test:e2e',
            'E2E Tests'
        );

        if (e2eResult.failed) {
            logger.error('E2E tests failed.');
        }

        return {
            unitTime: unitResult.duration,
            apiTime: apiResult.duration,
            e2eTime: e2eResult.duration,
            failed: e2eResult.failed
        };

    } catch (error: any) {
        logger.error('--- An error occurred during test execution ---');
        return {
            unitTime: 0,
            apiTime: 0,
            e2eTime: 0,
            failed: true
        };
    }
}

async function main() {
    const modeText = FAST_MODE ? '🚀 Fast Docker Validation' : '🚀 Full Docker Validation';
    logger.info(`Starting ${modeText} process for ${nodeEnv.toUpperCase()} environment...`);
    logger.info(`Environment file: ${envFilePath}`);

    // Check if rebuild is needed when in fast mode
    if (FAST_MODE) {
        const rebuildReasons = await checkIfRebuildNeeded();
        if (rebuildReasons.length > 0) {
            logger.warn('⚠️  Consider running full validation (without --fast) because:');
            rebuildReasons.forEach(reason => {
                logger.warn(`   • ${reason}`);
            });
            logger.warn(`   Run: pnpm validate:full --env=${nodeEnv} (without --fast)`);
        } else {
            logger.info('✅ Fast mode: Using existing Docker images');
        }
    }

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
    const reportTitle = FAST_MODE ?
        `🚀 Fast Docker Validation Timing Report (${nodeEnv.toUpperCase()})` :
        `🚀 Full Docker Validation Timing Report (${nodeEnv.toUpperCase()})`;
    logger.info(`=== ${reportTitle} ===`);

    // Setup steps
    logger.info('📋 Setup Steps:');
    setupTimings.forEach(({ name, duration }) => {
        logger.info(`   ${name.padEnd(25)} ${formatDuration(duration).padStart(8)}`);
    });
    logger.info(`   ${'TOTAL SETUP TIME'.padEnd(25)} ${formatDuration(setupTime).padStart(8)}`);

    // Test execution
    logger.info('🧪 Test Execution:');
    logger.info(`   ${'Unit Tests'.padEnd(25)} ${formatDuration(testResults.unitTime).padStart(8)}`);
    logger.info(`   ${'API Tests'.padEnd(25)} ${formatDuration(testResults.apiTime).padStart(8)}`);
    logger.info(`   ${'E2E Tests'.padEnd(25)} ${formatDuration(testResults.e2eTime).padStart(8)}`);
    logger.info(`   ${'TOTAL TEST TIME'.padEnd(25)} ${formatDuration(testTime).padStart(8)}`);

    // Overall summary
    logger.info('📊 Overall Summary:');
    logger.info(`   ${'Environment'.padEnd(25)} ${nodeEnv.toUpperCase().padStart(8)}`);
    logger.info(`   ${'Total Execution Time'.padEnd(25)} ${formatDuration(totalTime).padStart(8)}`);
    logger.info(`   ${'Test Count'.padEnd(25)} ${'212 tests'.padStart(8)}`);
    logger.info(`   ${'Success Rate'.padEnd(25)} ${(testResults.failed ? '❌ FAILED' : '✅ 100%').padStart(8)}`);

    if (FAST_MODE) {
        logger.info(`   ${'Mode'.padEnd(25)} ${'⚡ FAST'.padStart(8)}`);
    }

    // Cleanup
    logger.info('🧹 Cleaning up Docker environment...');
    try {
        await execa('pnpm dev:down', { shell: true, stdio: 'inherit', env: baseEnv });
    } catch (error) {
        logger.warn('Cleanup warning (non-fatal):', error);
    }

    if (testResults.failed) {
        logger.error(`❌ ${modeText} failed for ${nodeEnv.toUpperCase()} environment.`);
        process.exit(1);
    } else {
        logger.info(`✅ ${modeText} completed successfully for ${nodeEnv.toUpperCase()} environment!`);
    }
}

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 