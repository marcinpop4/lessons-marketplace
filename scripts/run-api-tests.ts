import { ChildProcess } from 'child_process';
import * as process from 'process';
import {
    loadEnvironment,
    prepareDatabase,
    runPnpmScript
} from './test-lifecycle'; // Import from the new utility

// --- Main Orchestration Function ---
async function runApiTests() {
    let finalExitCode = 1; // Default to failure

    try {
        // 1. Load Environment (Exits if NODE_ENV is missing)
        // Populates process.env directly
        loadEnvironment();

        // --- Configuration Check (use process.env) ---
        const PORT = process.env.PORT; // Read from process.env
        if (!PORT) {
            console.error('\n*** ERROR: PORT environment variable is not set after loading .env file. ***');
            console.error('Please ensure PORT is defined in your .env file.');
            process.exit(1);
        }
        const SERVER_RESOURCE = `tcp:${PORT}`;
        console.log(`Will wait for server on port: ${PORT}`);
        // --- End Configuration Check ---

        // 2. Reset Database and Run Seeds
        await prepareDatabase();

        // 4. Run API Tests
        const testResult = await runPnpmScript('test:api');
        finalExitCode = testResult.code ?? 1; // Capture exit code

        console.log('\n✅ API tests completed successfully.');
    } catch (error) {
        console.error('\n❌ API tests failed:', error);
        finalExitCode = 1;
    } finally {
        console.log('\n---> API test script finished.');
        process.exit(finalExitCode);
    }
}

// --- Run the Orchestrator ---
runApiTests(); 