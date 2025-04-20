import { spawn, ChildProcess } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as process from 'process';
import * as fs from 'fs';
// @ts-ignore - wait-on lacks types
import waitOn from 'wait-on';

const WAIT_TIMEOUT = 60000; // 60 seconds

/**
 * Validates NODE_ENV and loads the corresponding .env file directly into process.env.
 * Exits if NODE_ENV is missing or the .env file cannot be loaded.
 * @returns The validated NODE_ENV value.
 */
export function loadEnvironment(): string {
    const nodeEnv = process.env.NODE_ENV;
    if (!nodeEnv) {
        console.error('\n*** ERROR: NODE_ENV environment variable is not set. ***');
        console.error('Please run the script with NODE_ENV=<environment> prefix.');
        process.exit(1);
    }
    console.log(`Using NODE_ENV: ${nodeEnv}`);

    const envFilePath = path.resolve(process.cwd(), `env/.env.${nodeEnv}`);
    console.log(`Loading environment variables from: ${envFilePath}`);

    // Use dotenv.config() - it loads directly into process.env
    const envConfig = dotenv.config({ path: envFilePath });

    if (envConfig.error) {
        console.error(`\n*** ERROR: Could not load environment file: ${envFilePath} ***`);
        console.error(`Error details: ${envConfig.error.message}`);
        // Check if the error is because the file doesn't exist (using type assertion)
        if ((envConfig.error as NodeJS.ErrnoException)?.code === 'ENOENT') {
            console.error('File not found.');
        }
        process.exit(1);
    }

    // dotenv.config() modifies process.env directly
    console.log('Environment variables loaded successfully into process.env.');

    // Ensure NODE_ENV is correctly set in process.env even if .env file overwrites it
    process.env.NODE_ENV = nodeEnv;

    return nodeEnv;
}

/**
 * Runs a pnpm script and returns a promise that resolves/rejects based on exit code.
 */
export function runPnpmScript(scriptName: string, env: NodeJS.ProcessEnv = process.env): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
    console.log(`\n---> Running pnpm script: ${scriptName}`);
    return new Promise((resolve, reject) => {
        const command = 'pnpm';
        const args = ['run', scriptName];
        const pnpmProcess = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, ...env }
        });

        pnpmProcess.on('error', (err) => {
            console.error(`Failed to start script: ${scriptName}`, err);
            reject(err);
        });

        pnpmProcess.on('close', (code, signal) => {
            console.log(`---> Script ${scriptName} finished with code: ${code}, signal: ${signal}`);
            if (code === 0) {
                resolve({ code, signal });
            } else {
                reject(new Error(`Script ${scriptName} failed with exit code ${code}`));
            }
        });
    });
}

export async function prepareDatabase(): Promise<void> {
    await runPnpmScript('prisma:reset --force');
    await runPnpmScript('prisma:seed');
}

/**
 * Starts a background process using pnpm, waits for specified resources, and returns the process.
 * NOTE: Uses the current `process.env` which should be populated by `loadEnvironment`.
 * @param scriptToRun The pnpm script name to execute (e.g., 'dev:server', 'dev:full').
 * @param resourcesToWaitFor An array of resources for waitOn (e.g., ['tcp:3000', 'http://localhost:5173']).
 * @returns The started ChildProcess.
 */
export async function startProcessAndWait(scriptToRun: string, resourcesToWaitFor: string[]): Promise<ChildProcess> {
    console.log(`\n---> Starting background process: pnpm run ${scriptToRun}...`);
    const backgroundProcess = spawn('pnpm', ['run', scriptToRun], {
        stdio: ['ignore', 'inherit', 'inherit'], // Show output, but don't pipe stdin
        shell: true,
        detached: false, // Keep attached for easier group killing
        env: process.env
    });

    backgroundProcess.on('error', (err) => {
        console.error(`Failed to start background script ${scriptToRun}:`, err);
        // Exit the main orchestrator script if the background process fails to start
        process.exit(1);
    });

    console.log(`\n---> Waiting for resources: ${resourcesToWaitFor.join(', ')} (timeout: ${WAIT_TIMEOUT / 1000}s)...`);
    try {
        await waitOn({
            resources: resourcesToWaitFor,
            timeout: WAIT_TIMEOUT,
            log: true
        });
        console.log('---> Resources are ready.');
        return backgroundProcess;
    } catch (err) {
        console.error('---> Resources did not become available within timeout.');
        // Attempt to kill the process if waitOn fails
        stopProcess(backgroundProcess);
        throw err; // Re-throw error to stop the orchestration
    }
}

/**
 * Gracefully stops a background process (and its children) using SIGTERM.
 * Handles ESRCH error if the process is already gone.
 * @param processToStop The ChildProcess object to stop.
 */
export function stopProcess(processToStop: ChildProcess | null): void {
    if (processToStop && !processToStop.killed && processToStop.pid) {
        const pid = processToStop.pid;
        console.log(`\n---> Stopping background process (PID: ${pid})...`);
        try {
            // Send SIGTERM to the process group (negative PID)
            process.kill(-pid, 'SIGTERM');
            console.log(`---> Sent SIGTERM to process group ${-pid}.`);
        } catch (killError: any) {
            if (killError.code === 'ESRCH') {
                console.log(`---> Process group ${-pid} already exited.`);
            } else {
                console.error(`---> Error trying to kill process group ${-pid}:`, killError);
                // Fallback: Try killing the main process directly if group kill failed
                try {
                    if (!processToStop.killed) {
                        processToStop.kill('SIGTERM');
                        console.log(`---> Sent fallback SIGTERM to main process ${pid}.`);
                    }
                } catch (fallbackError) {
                    console.error(`---> Fallback kill attempt for PID ${pid} also failed:`, fallbackError);
                }
            }
        }
    } else {
        console.log('\n---> Background process not found, already stopped, or PID missing.');
    }
} 