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
import { config } from 'dotenv';
import pino from 'pino';
import { safeValidateValidationTiming, type ValidationTiming } from '@shared/schemas/devops-schema-v1.js';
import { z } from 'zod';

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
    { name: 'Start Services', command: 'pnpm dev:up:structured' },
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
        const endTime = Date.now();
        const duration = endTime - startTime;
        logger.error(`Error in step ${step.name}:`, error);
        throw new Error(`Setup step "${step.name}" failed after ${formatDuration(duration)}`);
    }
}

async function runTestCommand(
    command: string,
    title: string
): Promise<{ duration: number; failed: boolean; testCount: number }> {
    const startTime = Date.now();
    logger.info(`---> Running: ${title} (${command})...`);

    let testCount = 0;

    try {
        // Determine report file path based on test type
        const timestamp = Date.now();
        let reportFile = '';
        let modifiedCommand = command;

        if (title.toLowerCase().includes('unit')) {
            reportFile = `tests/results/unit/jest-report-${timestamp}.json`;
            modifiedCommand = command.replace(
                'npm run test:unit:container',
                `dotenv -e env/.env.${process.env.NODE_ENV} -- docker compose -f docker/docker-compose.yml run --rm test npx jest --config tests/unit/jest.config.js --json --outputFile=${reportFile}`
            );
        } else if (title.toLowerCase().includes('api')) {
            reportFile = `tests/results/api/jest-report-${timestamp}.json`;
            modifiedCommand = command.replace(
                'npm run test:api:container',
                `dotenv -e env/.env.${process.env.NODE_ENV} -- docker compose -f docker/docker-compose.yml run --rm test npx jest --config tests/api/jest.config.js --json --outputFile=${reportFile}`
            );
        } else if (title.toLowerCase().includes('logs')) {
            reportFile = `tests/results/logs/jest-report-${timestamp}.json`;
            modifiedCommand = command.replace(
                'npm run test:logs:container',
                `dotenv -e env/.env.${process.env.NODE_ENV} -- docker compose -f docker/docker-compose.yml run --rm test npx jest --config tests/logs/jest.config.js --json --outputFile=${reportFile}`
            );
        } else if (title.toLowerCase().includes('e2e')) {
            // For E2E, use the standard command and read from the fixed path
            reportFile = `tests/results/e2e/results.json`;
            // Use the :container version that runs just the Playwright command
            modifiedCommand = command.replace(
                'npm run test:e2e:container',
                'npm run test:e2e:container'
            );
        }

        // Run tests normally with output shown in real-time
        await execa(modifiedCommand, { shell: true, stdio: 'inherit', env: baseEnv });
        const endTime = Date.now();

        // Parse test count from generated report
        testCount = await parseTestCountFromReport(reportFile, title);

        logger.info(`---> Finished: ${title} (Success) - ${testCount} tests`);
        return { duration: endTime - startTime, failed: false, testCount };
    } catch (error) {
        const endTime = Date.now();

        logger.error(`---> Failed: ${title}`);
        return { duration: endTime - startTime, failed: true, testCount: 0 };
    }
}

async function parseTestCountFromReport(reportFile: string, testType: string): Promise<number> {
    logger.info(`Parsing test report for ${testType} from ${reportFile}...`);

    try {
        const fs = await import('fs/promises');
        const reportContent = await fs.readFile(reportFile, 'utf-8');
        const report = JSON.parse(reportContent);

        if (testType.toLowerCase().includes('e2e')) {
            // Playwright: stats.expected or count from suites
            if (report.stats && typeof report.stats.expected === 'number') {
                logger.info(`Found ${report.stats.expected} tests in Playwright report`);
                return report.stats.expected;
            }
            // Alternative: look at suites structure
            if (report.suites && Array.isArray(report.suites)) {
                let testCount = 0;
                const countTestsInSuite = (suite: any) => {
                    if (suite.specs && Array.isArray(suite.specs)) {
                        testCount += suite.specs.length;
                    }
                    if (suite.suites && Array.isArray(suite.suites)) {
                        suite.suites.forEach(countTestsInSuite);
                    }
                };
                report.suites.forEach(countTestsInSuite);
                logger.info(`Found ${testCount} tests by counting specs in Playwright report`);
                return testCount;
            }
        } else {
            // Jest: numTotalTests
            if (typeof report.numTotalTests === 'number') {
                logger.info(`Found ${report.numTotalTests} tests in Jest report`);
                return report.numTotalTests;
            }
        }

        logger.warn(`Could not find test count in ${reportFile}`);
        return 0;
    } catch (error) {
        logger.warn(`Failed to parse test report ${reportFile}:`, error);
        return 0;
    }
}

async function runTests(): Promise<{
    unitTime: number;
    apiTime: number;
    e2eTime: number;
    logsTime: number;
    unitCount: number;
    apiCount: number;
    e2eCount: number;
    logsCount: number;
    failed: boolean
}> {
    try {
        // Clean and create organized test results directories
        logger.info('🧹 Organizing test results directories...');
        try {
            await execa('rm', ['-rf', 'tests/results/unit', 'tests/results/api', 'tests/results/e2e', 'tests/results/logs'], { shell: true });
            await execa('mkdir', ['-p', 'tests/results/unit', 'tests/results/api', 'tests/results/e2e/screenshots', 'tests/results/logs'], { shell: true });
        } catch (error) {
            logger.warn('Could not clean test results directories (non-fatal):', error);
        }

        // Run each test suite separately to get accurate timing and counts
        logger.info('🧪 Running test suites...');
        const unitResult = await runTestCommand(
            'NODE_ENV=test npm run test:unit:container',
            'Unit Tests'
        );
        const apiResult = await runTestCommand(
            'NODE_ENV=test npm run test:api:container',
            'API Tests'
        );
        const e2eResult = await runTestCommand(
            'NODE_ENV=test npm run test:e2e:container',
            'E2E Tests'
        );
        const logsResult = await runTestCommand(
            'NODE_ENV=test npm run test:logs:container',
            'Logs Tests'
        );

        const failed = unitResult.failed || apiResult.failed || e2eResult.failed || logsResult.failed;

        return {
            unitTime: unitResult.duration,
            apiTime: apiResult.duration,
            e2eTime: e2eResult.duration,
            logsTime: logsResult.duration,
            unitCount: unitResult.testCount,
            apiCount: apiResult.testCount,
            e2eCount: e2eResult.testCount,
            logsCount: logsResult.testCount,
            failed
        };
    } catch (error) {
        logger.error('Error during test execution:', error);
        return {
            unitTime: 0,
            apiTime: 0,
            e2eTime: 0,
            logsTime: 0,
            unitCount: 0,
            apiCount: 0,
            e2eCount: 0,
            logsCount: 0,
            failed: true
        };
    }
}

async function main() {
    const modeText = FAST_MODE ? '🚀 Fast Docker Validation' : '🚀 Full Docker Validation';
    logger.info(`Starting ${modeText} process for ${nodeEnv.toUpperCase()} environment...`);
    logger.info(`Environment file: ${envFilePath}`);

    // Initialize tracking variables
    const setupTimings: { name: string; duration: number }[] = [];
    let setupTime = 0;
    let testResults = {
        unitTime: 0,
        apiTime: 0,
        e2eTime: 0,
        logsTime: 0,
        unitCount: 0,
        apiCount: 0,
        e2eCount: 0,
        logsCount: 0,
        failed: false
    };
    let totalTime = 0;
    let validationSuccess = false;
    let failureReason = '';
    let failureStage = '';

    try {
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

        // Run setup steps
        failureStage = 'setup';
        for (const step of setupSteps) {
            const duration = await runSetupStep(step);
            setupTimings.push({ name: step.name, duration });
            setupTime += duration;
        }

        // Run tests
        failureStage = 'testing';
        testResults = await runTests();
        const testTime = testResults.unitTime + testResults.apiTime + testResults.e2eTime + testResults.logsTime;
        totalTime = setupTime + testTime;

        if (testResults.failed) {
            validationSuccess = false;
            failureReason = 'Test suite failures';
            failureStage = 'testing';
        } else {
            validationSuccess = true;
            failureStage = 'completed';
        }

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
        logger.info(`   ${'Unit Tests'.padEnd(25)} ${formatDuration(testResults.unitTime).padStart(8)} (${testResults.unitCount} tests)`);
        logger.info(`   ${'API Tests'.padEnd(25)} ${formatDuration(testResults.apiTime).padStart(8)} (${testResults.apiCount} tests)`);
        logger.info(`   ${'Logs Tests'.padEnd(25)} ${formatDuration(testResults.logsTime).padStart(8)} (${testResults.logsCount} tests)`);
        logger.info(`   ${'E2E Tests'.padEnd(25)} ${formatDuration(testResults.e2eTime).padStart(8)} (${testResults.e2eCount} tests)`);
        logger.info(`   ${'TOTAL TEST TIME'.padEnd(25)} ${formatDuration(testTime).padStart(8)}`);

        // Calculate total test count dynamically
        const totalTestCount = testResults.unitCount + testResults.apiCount + testResults.e2eCount + testResults.logsCount;

        // Overall summary
        logger.info('📊 Overall Summary:');
        logger.info(`   ${'Environment'.padEnd(25)} ${nodeEnv.toUpperCase().padStart(8)}`);
        logger.info(`   ${'Total Execution Time'.padEnd(25)} ${formatDuration(totalTime).padStart(8)}`);
        logger.info(`   ${'Test Count'.padEnd(25)} ${`${totalTestCount} tests`.padStart(8)}`);
        logger.info(`   ${'Success Rate'.padEnd(25)} ${(testResults.failed ? '❌ FAILED' : '✅ 100%').padStart(8)}`);

        if (FAST_MODE) {
            logger.info(`   ${'Mode'.padEnd(25)} ${'⚡ FAST'.padStart(8)}`);
        }

    } catch (error: any) {
        validationSuccess = false;
        failureReason = error.message || 'Unknown error';
        totalTime = setupTime + (testResults.unitTime + testResults.apiTime + testResults.e2eTime + testResults.logsTime);

        logger.error(`❌ ${modeText} failed during ${failureStage} stage: ${failureReason}`);
    } finally {
        // Always log structured timing data for Grafana visualization, even on failure
        const testTime = testResults.unitTime + testResults.apiTime + testResults.e2eTime + testResults.logsTime;
        const totalTestCount = testResults.unitCount + testResults.apiCount + testResults.e2eCount + testResults.logsCount;
        const rawValidationTiming = {
            schemaVersion: '1.0.0' as const,
            service: 'lessons-marketplace',
            component: 'devops-logs',
            environment: nodeEnv.toUpperCase() as 'DEVELOPMENT' | 'TEST' | 'PRODUCTION',
            mode: FAST_MODE ? 'fast' : 'full',
            success: validationSuccess,
            totalExecutionTimeMs: totalTime,
            totalSetupTimeMs: setupTime,
            totalTestTimeMs: testTime,
            totalTestCount: totalTestCount,
            failureReason: failureReason || '',
            failureStage: failureStage || '',
            setupSteps: {
                cleanDockerMs: setupTimings.find(s => s.name === 'Clean Docker Environment')?.duration || null,
                buildImagesMs: setupTimings.find(s => s.name === 'Build Docker Images')?.duration || null,
                startServicesMs: setupTimings.find(s => s.name === 'Start Services')?.duration || null,
                installDepsMs: setupTimings.find(s => s.name === 'Install Dependencies')?.duration || null,
                generatePrismaMs: setupTimings.find(s => s.name === 'Generate Prisma Client')?.duration || null,
                setupDatabaseMs: setupTimings.find(s => s.name === 'Setup Database')?.duration || null,
                diagnoseTypescriptMs: setupTimings.find(s => s.name === 'Diagnose TypeScript')?.duration || null,
            },
            testSuites: {
                unitTestsMs: testResults.unitTime || null,
                apiTestsMs: testResults.apiTime || null,
                e2eTestsMs: testResults.e2eTime || null,
                logsTestsMs: testResults.logsTime || null,
            },
            testCounts: {
                unitTestCount: testResults.unitCount || null,
                apiTestCount: testResults.apiCount || null,
                e2eTestCount: testResults.e2eCount || null,
                logsTestCount: testResults.logsCount || null,
            },
            performance: {
                setupTimeSeconds: Math.round((setupTime / 1000) * 100) / 100,
                testTimeSeconds: Math.round((testTime / 1000) * 100) / 100,
                totalTimeSeconds: Math.round((totalTime / 1000) * 100) / 100,
                setupPercentage: Math.round((setupTime / totalTime) * 100 * 100) / 100,
                testPercentage: Math.round((testTime / totalTime) * 100 * 100) / 100,
            }
        };

        // Validate the structured data before logging
        const validationResult = safeValidateValidationTiming(rawValidationTiming);
        if (validationResult.success) {
            logger.info(validationResult.data, `Validation timing data (schema v${validationResult.version})`);
        } else {
            logger.error({ error: validationResult.error }, 'Failed to validate timing data structure - logging raw data');
            logger.info(rawValidationTiming, 'Raw validation timing data (unvalidated)');
        }

        // Cleanup
        logger.info('🧹 Cleaning up Docker environment...');
        try {
            await execa('pnpm dev:down', { shell: true, stdio: 'inherit', env: baseEnv });
        } catch (error) {
            logger.warn('Cleanup warning (non-fatal):', error);
        }

        if (!validationSuccess) {
            logger.error(`❌ ${modeText} failed for ${nodeEnv.toUpperCase()} environment.`);
            process.exit(1);
        } else {
            logger.info(`✅ ${modeText} completed successfully for ${nodeEnv.toUpperCase()} environment!`);
        }
    }
}

main().catch((error) => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 