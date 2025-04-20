import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

const projectRoot = process.cwd();

// --- Environment Loading --- 
// 1. Check for NODE_ENV
const nodeEnv = process.env.NODE_ENV;
if (!nodeEnv) {
    console.error('\n*** ERROR [Playwright Config]: NODE_ENV environment variable is not set. ***');
    console.error('Please run Playwright tests with NODE_ENV prefix (e.g., NODE_ENV=development pnpm test:e2e:local).');
    process.exit(1);
}
console.log(`[Playwright Config] Using NODE_ENV: ${nodeEnv}`);

// 2. Construct .env path and load
const envFilePath = path.resolve(projectRoot, `env/.env.${nodeEnv}`);
console.log(`[Playwright Config] Loading environment variables from: ${envFilePath}`);
const envConfig = dotenv.config({ path: envFilePath });

if (envConfig.error) {
    console.error(`\n*** ERROR [Playwright Config]: Could not load environment file: ${envFilePath} ***`);
    console.error(`Error details: ${envConfig.error.message}`);
    if ((envConfig.error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        console.error('File not found.');
    }
    process.exit(1);
}
console.log(`[Playwright Config] Environment variables loaded successfully.`);
// --- End Environment Loading ---


// 3. Determine baseURL AFTER loading .env
const baseURL = process.env.FRONTEND_URL;

// 4. Validate baseURL
if (!baseURL) {
    console.error('\n*** ERROR [Playwright Config]: FRONTEND_URL not found in environment variables. ***');
    console.error(`Ensure FRONTEND_URL is defined in ${envFilePath}`);
    process.exit(1);
}
console.log(`[Playwright Config] Using baseURL: ${baseURL}`);


// 5. Process timeout values ONLY if they are set in the environment
const timeoutStr = process.env.PLAYWRIGHT_TIMEOUT;
const actionTimeoutStr = process.env.PLAYWRIGHT_ACTION_TIMEOUT;
const navigationTimeoutStr = process.env.PLAYWRIGHT_NAVIGATION_TIMEOUT;

const configOverrides: { timeout?: number } = {};
const useOverrides: { actionTimeout?: number; navigationTimeout?: number } = {};

if (timeoutStr) {
    const parsed = parseInt(timeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_TIMEOUT value "${timeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    configOverrides.timeout = parsed;
    console.log(`[Playwright Config] Overriding default test timeout: ${parsed}ms`);
} else {
    console.log(`[Playwright Config] Using default test timeout (30000ms).`);
}

if (actionTimeoutStr) {
    const parsed = parseInt(actionTimeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_ACTION_TIMEOUT value "${actionTimeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    useOverrides.actionTimeout = parsed;
    console.log(`[Playwright Config] Overriding default action timeout: ${parsed}ms`);
} else {
    console.log(`[Playwright Config] Using default action timeout (0ms - uses test timeout).`);
}

if (navigationTimeoutStr) {
    const parsed = parseInt(navigationTimeoutStr, 10);
    if (isNaN(parsed)) {
        console.error(`\n*** ERROR [Playwright Config]: Invalid PLAYWRIGHT_NAVIGATION_TIMEOUT value "${navigationTimeoutStr}". Must be an integer. ***`);
        process.exit(1);
    }
    useOverrides.navigationTimeout = parsed;
    console.log(`[Playwright Config] Overriding default navigation timeout: ${parsed}ms`);
} else {
    console.log(`[Playwright Config] Using default navigation timeout (0ms - uses test timeout).`);
}


export default defineConfig({
    testDir: '.',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: path.join(projectRoot, 'tests/results/playwright-report'), open: 'never' }],
        ['list']
    ],
    // Apply timeout override if present, otherwise use default
    ...configOverrides,
    use: {
        baseURL,
        screenshot: {
            mode: 'only-on-failure',
            fullPage: true
        },
        video: 'on-first-retry',
        headless: true,
        // Apply action/navigation timeout overrides if present, otherwise use defaults
        ...useOverrides,
        trace: 'retain-on-failure'
    },
    outputDir: path.join(projectRoot, 'tests/results/screenshots'),
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // No webServer block - managed by orchestrator scripts or docker-compose
}); 