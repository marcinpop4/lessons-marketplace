import { execa } from 'execa';
import { ChildProcess } from 'child_process'; // Use Node's built-in type
// @ts-ignore - Suppressing persistent type error despite @types/wait-on installation
import waitOn from 'wait-on';
import chalk from 'chalk'; // For better logging
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
// Check for HOST and PORT separately, construct URL in script
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
// --- End Environment Variable Checks ---

// Now that .env is loaded and vars are checked, define constants using process.env
// Ensure environment is set correctly *after* loading dotenv, though NODE_ENV is often set externally
process.env.NODE_ENV = 'development';

const SERVER_PORT = process.env.PORT!; // Non-null assertion (!)
const FRONTEND_HOST = process.env.FRONTEND_HOST!; // Non-null assertion (!)
const FRONTEND_PORT = process.env.FRONTEND_PORT!; // Non-null assertion (!)

// Construct FRONTEND_URL explicitly in the script
const FRONTEND_URL = `${FRONTEND_HOST}:${FRONTEND_PORT}`;

const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Base environment for child processes
const baseEnv = {
    ...process.env,
    NODE_NO_WARNINGS: '1',
    SILENCE_PRISMA_EXPECTED_ERRORS: 'true' // Add variable to silence prisma errors
};

// Helper to run commands and log output
const runCommand = async (
    command: string,
    args: string[],
    options: { cwd?: string; title: string; exitOnError?: boolean } = { title: command, exitOnError: true }
): Promise<{ exitCode: number | null; failed: boolean }> => {
    console.log(chalk.blue(`\n---> Running: ${options.title} (${command} ${args.join(' ')})...`));
    try {
        const subprocess = execa(command, args, {
            stdio: 'inherit', // Show output directly
            cwd: options.cwd || process.cwd(),
            env: baseEnv, // Use the base environment with NODE_NO_WARNINGS
        });
        const result = await subprocess;
        console.log(chalk.green(`---> Finished: ${options.title} (Success)`));
        return { exitCode: result.exitCode ?? null, failed: false };
    } catch (error: any) {
        console.error(chalk.red(`---> Failed: ${options.title}`));
        // execa errors often include stdout/stderr which might be useful
        if (error.stderr) {
            console.error(chalk.red(error.stderr));
        }
        if (error.stdout) {
            console.error(chalk.red(error.stdout));
        }
        console.error(chalk.red(`Error message: ${error.message}`));

        if (options.exitOnError !== false) {
            console.error(chalk.red('Exiting due to error.'));
            // Ensure background processes are killed before exiting
            await killProcesses();
            process.exit(1);
        }
        return { exitCode: error.exitCode ?? 1, failed: true };
    }
};

// Store background processes
let serverProcess: any | null = null;
let frontendProcess: any | null = null;

// Function to kill background processes gracefully
const killProcesses = async () => {
    const killPromises: Promise<any>[] = [];
    if (serverProcess && !serverProcess.killed) {
        console.log(chalk.yellow('Attempting to kill server process...'));
        serverProcess.kill('SIGTERM'); // Removed forceKillAfterTimeout
        // Catch errors during kill, but don't let them stop other cleanup
        killPromises.push(serverProcess.catch((e: Error) => console.error(chalk.red('Error killing server process:', e.message))));
    }
    if (frontendProcess && !frontendProcess.killed) {
        console.log(chalk.yellow('Attempting to kill frontend process...'));
        frontendProcess.kill('SIGTERM'); // Removed forceKillAfterTimeout
        killPromises.push(frontendProcess.catch((e: Error) => console.error(chalk.red('Error killing frontend process:', e.message))));
    }
    // Wait for kill signals to be sent and processes to potentially exit
    await Promise.allSettled(killPromises);
    console.log(chalk.yellow('Background processes cleanup attempted.'));
};

// Main execution function
async function main() {
    let finalExitCode = 0;

    // Trap exit signals to ensure cleanup
    const cleanupAndExit = async (signal: NodeJS.Signals) => {
        console.log(chalk.yellow(`\nReceived ${signal}. Cleaning up...`));
        await killProcesses();
        process.exit(1); // Exit with error code on interruption
    };
    process.on('SIGINT', () => cleanupAndExit('SIGINT'));
    process.on('SIGTERM', () => cleanupAndExit('SIGTERM'));


    try {
        // 1. Run Unit Tests
        await runCommand('pnpm', ['test:unit'], { title: 'Unit Tests' });

        // 2. Start Server and Frontend in background
        console.log(chalk.blue('\n---> Starting background services...'));
        // Start server explicitly with NODE_ENV. The dev:server script uses dotenv-cli which respects process.env.NODE_ENV
        // Ignore stderr for the server process during tests to hide expected Prisma errors
        serverProcess = execa('pnpm', ['run', 'dev:server:no-watch'], { stdio: ['inherit', 'inherit', 'ignore'], env: baseEnv });
        // Start frontend. The dev:frontend script also uses dotenv-cli.
        // Set the environment variable to disable proxy logs for this specific process
        const frontendEnv = { ...baseEnv, DISABLE_VITE_PROXY_LOGS: 'true' }; // Merge baseEnv with specific var
        frontendProcess = execa('pnpm', ['run', 'dev:frontend'], { stdio: 'inherit', env: frontendEnv });

        // Handle potential early exit of background processes (optional but good practice)
        serverProcess.catch((e: Error) => {
            if (!serverProcess?.killed) console.error(chalk.red('Server process exited unexpectedly:'), e.message);
        });
        frontendProcess.catch((e: Error) => {
            if (!frontendProcess?.killed) console.error(chalk.red('Frontend process exited unexpectedly:'), e.message);
        });


        // 3. Wait for services
        // Use the explicitly constructed FRONTEND_URL here
        console.log(chalk.blue(`\n---> Waiting for services (Server: ${SERVER_URL}, Frontend: ${FRONTEND_URL})...`));
        try {
            await waitOn({
                resources: [
                    `tcp:${SERVER_PORT}`, // Use tcp for server port check
                    FRONTEND_URL        // Use the constructed URL for Vite frontend check
                ],
                timeout: 180000, // 3 minutes timeout
                log: true,
                validateStatus: function (status: number) { // Added type for status
                    // Allow any 2xx/3xx status for frontend, server only needs port check
                    return status >= 200 && status < 400;
                },
            });
            console.log(chalk.green('Services are ready.'));
        } catch (err) {
            console.error(chalk.red('Services did not start in time.'), err);
            throw new Error('Services failed to start'); // Throw to trigger finally block and exit
        }

        // 5. Run API Tests
        await runCommand('pnpm', ['test:api'], { title: 'API Tests' });

        // 6. Run E2E Tests
        // Don't exit immediately on E2E failure, allow cleanup first
        const e2eResult = await runCommand('pnpm', ['test:e2e'], { title: 'E2E Tests', exitOnError: false });
        if (e2eResult.failed) {
            finalExitCode = e2eResult.exitCode ?? 1; // Use E2E exit code if failed
        }


    } catch (error: any) { // Added type for error
        // Catch errors from unit tests, setup, wait-on, or api tests
        console.error(chalk.red(`\n--- An error occurred during the test execution ---`));
        // Error message is already logged by runCommand or waitOn handler
        finalExitCode = 1; // Ensure non-zero exit code on error
    } finally {
        // 7. Cleanup background processes
        await killProcesses();
    }

    if (finalExitCode === 0) {
        console.log(chalk.green.bold('\n✅ All tests passed successfully!'));
    } else {
        console.log(chalk.red.bold(`\n❌ Tests failed with exit code ${finalExitCode}.`));
    }

    process.exit(finalExitCode);
}

main(); 