import { ChildProcess } from 'child_process';
import * as process from 'process';
import {
    loadEnvironment,
    prepareDatabase,
    runPnpmScript
} from './test-lifecycle';

// --- Main Orchestration Function ---
async function runE2ETests() {
    let finalExitCode = 1; // Default to failure

    try {
        // 1. Load Environment
        // Populates process.env directly
        loadEnvironment();

        // --- Configuration Check (use process.env) ---
        const PORT = process.env.PORT;
        const FRONTEND_URL = process.env.FRONTEND_URL;

        if (!PORT || !FRONTEND_URL) {
            console.error('\n*** ERROR: Missing required environment variables after loading .env file. ***');
            if (!PORT) console.error('- PORT is not set.');
            if (!FRONTEND_URL) console.error('- FRONTEND_URL is not set (needed by Playwright and wait-on).');
            console.error('Please ensure these are defined in your .env file.');
            process.exit(1);
        }
        const SERVER_RESOURCE = `tcp:${PORT}`;
        const FRONTEND_RESOURCE = FRONTEND_URL;
        console.log(`Will wait for server on port: ${PORT}`);
        console.log(`Will wait for frontend on: ${FRONTEND_RESOURCE}`);
        // --- End Configuration Check ---

        // 2. Reset Database and Run Seeds
        await prepareDatabase();

        // 4. Run E2E Tests
        const testResult = await runPnpmScript('test:e2e');
        finalExitCode = testResult.code ?? 1; // Capture exit code

        if (finalExitCode === 0) {
            console.log('\n✅ E2E tests completed successfully.');
        } else {
            console.error('\n❌ E2E tests failed with exit code:', finalExitCode);
        }

    } catch (error) {
        console.error('\n❌ E2E tests failed:', error);
        finalExitCode = 1; // Ensure failure code on error
    } finally {
        console.log('\n---> E2E test script finished.');
        process.exit(finalExitCode);
    }
}

// --- Run the Orchestrator ---
runE2ETests(); 