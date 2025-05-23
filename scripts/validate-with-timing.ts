import { execa } from 'execa';
import { ChildProcess } from 'child_process';
// @ts-ignore - Suppressing persistent type error despite @types/wait-on installation
import waitOn from 'wait-on';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Determine the root directory based on script location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..'); // Assumes script is in ./scripts

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
    SILENCE_PRISMA_EXPECTED_ERRORS: 'true'
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
    console.log(chalk.blue(`\nRunning: ${step.name}`));
    const startTime = Date.now();

    try {
        await execa(step.command, { shell: true, stdio: 'inherit' });
        const endTime = Date.now();
        return endTime - startTime;
    } catch (error) {
        console.error(chalk.red(`Error in step ${step.name}:`), error);
        process.exit(1);
    }
}

async function runTestCommand(
    command: string,
    args: string[],
    title: string
): Promise<{ duration: number; failed: boolean }> {
    const startTime = Date.now();
    console.log(chalk.blue(`\n---> Running: ${title} (${command} ${args.join(' ')})...`));

    try {
        const subprocess = execa(command, args, {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: baseEnv,
        });
        const result = await subprocess;
        const endTime = Date.now();
        console.log(chalk.green(`---> Finished: ${title} (Success)`));
        return { duration: endTime - startTime, failed: false };
    } catch (error: any) {
        const endTime = Date.now();
        console.error(chalk.red(`---> Failed: ${title}`));
        return { duration: endTime - startTime, failed: true };
    }
}

// Function to kill background processes gracefully
const killProcesses = async () => {
    const killPromises: Promise<any>[] = [];
    if (serverProcess && !serverProcess.killed) {
        console.log(chalk.yellow('Attempting to kill server process...'));
        serverProcess.kill('SIGTERM');
        killPromises.push(serverProcess.catch((e: Error) => console.error(chalk.red('Error killing server process:', e.message))));
    }
    if (frontendProcess && !frontendProcess.killed) {
        console.log(chalk.yellow('Attempting to kill frontend process...'));
        frontendProcess.kill('SIGTERM');
        killPromises.push(frontendProcess.catch((e: Error) => console.error(chalk.red('Error killing frontend process:', e.message))));
    }
    await Promise.allSettled(killPromises);
    console.log(chalk.yellow('Background processes cleanup attempted.'));
};

async function runTests(): Promise<{ unitTime: number; apiTime: number; e2eTime: number; failed: boolean }> {
    let finalExitCode = 0;

    // Trap exit signals to ensure cleanup
    const cleanupAndExit = async (signal: NodeJS.Signals) => {
        console.log(chalk.yellow(`\nReceived ${signal}. Cleaning up...`));
        await killProcesses();
        process.exit(1);
    };
    process.on('SIGINT', () => cleanupAndExit('SIGINT'));
    process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));

    try {
        // 1. Run Unit Tests
        const unitResult = await runTestCommand('pnpm', ['test:unit'], 'Unit Tests');
        if (unitResult.failed) finalExitCode = 1;

        // 2. Start Server and Frontend in background
        console.log(chalk.blue('\n---> Starting background services...'));
        const servicesStartTime = Date.now();

        serverProcess = execa('pnpm', ['run', 'dev:server:no-watch'], { stdio: ['inherit', 'inherit', 'ignore'], env: baseEnv });
        const frontendEnv = { ...baseEnv, DISABLE_VITE_PROXY_LOGS: 'true' };
        frontendProcess = execa('pnpm', ['run', 'dev:frontend'], { stdio: 'inherit', env: frontendEnv });

        // Handle potential early exit of background processes
        serverProcess.catch((e: Error) => {
            if (!serverProcess?.killed) console.error(chalk.red('Server process exited unexpectedly:'), e.message);
        });
        frontendProcess.catch((e: Error) => {
            if (!frontendProcess?.killed) console.error(chalk.red('Frontend process exited unexpectedly:'), e.message);
        });

        // 3. Wait for services
        console.log(chalk.blue(`\n---> Waiting for services (Server: ${SERVER_URL}, Frontend: ${FRONTEND_URL})...`));
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
            console.log(chalk.green(`Services are ready (took ${formatDuration(servicesDuration)}).`));
        } catch (err) {
            console.error(chalk.red('Services did not start in time.'), err);
            throw new Error('Services failed to start');
        }

        // 4. Run API Tests
        const apiResult = await runTestCommand('pnpm', ['test:api'], 'API Tests');
        if (apiResult.failed) finalExitCode = 1;

        // 5. Run E2E Tests
        const e2eResult = await runTestCommand('pnpm', ['test:e2e'], 'E2E Tests');
        if (e2eResult.failed) finalExitCode = 1;

        // Cleanup background processes
        await killProcesses();

        return {
            unitTime: unitResult.duration,
            apiTime: apiResult.duration,
            e2eTime: e2eResult.duration,
            failed: finalExitCode !== 0
        };

    } catch (error: any) {
        console.error(chalk.red(`\n--- An error occurred during test execution ---`));
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
    console.log(chalk.green('Starting validation process...\n'));

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
    console.log(chalk.green('\n=== Validation Timing Report ==='));

    // Setup steps
    console.log(chalk.yellow('\nSetup steps:'));
    setupTimings.forEach(({ name, duration }) => {
        console.log(chalk.cyan(`${name}: ${formatDuration(duration)}`));
    });
    console.log(chalk.magenta(`Total setup time: ${formatDuration(setupTime)}`));

    // Test execution
    console.log(chalk.yellow('\nTest execution:'));
    console.log(chalk.cyan(`Unit tests: ${formatDuration(testResults.unitTime)}`));
    console.log(chalk.cyan(`API tests: ${formatDuration(testResults.apiTime)}`));
    console.log(chalk.cyan(`E2E tests: ${formatDuration(testResults.e2eTime)}`));
    console.log(chalk.magenta(`Total test time: ${formatDuration(testTime)}`));

    // Overall summary
    console.log(chalk.green('\nOverall summary:'));
    console.log(chalk.cyan(`Total execution time: ${formatDuration(totalTime)}`));

    if (testResults.failed) {
        console.log(chalk.red.bold('\n❌ Validation failed.'));
        process.exit(1);
    } else {
        console.log(chalk.green.bold('\n✅ Validation completed successfully!'));
    }
}

main().catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
}); 