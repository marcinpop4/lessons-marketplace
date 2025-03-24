/**
 * Script to run all tests (unit and e2e)
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Running all tests (unit tests followed by e2e tests)...');

// Function to run a command and return a promise
const runCommand = (command: string, args: string[], env = {}): Promise<number> => {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...env
      }
    });
    
    childProcess.on('error', (err) => {
      console.error(`Failed to run command: ${err.message}`);
      reject(err);
    });
    
    childProcess.on('exit', (code) => {
      resolve(code || 0);
    });
  });
};

// Main function to run all tests
const runAllTests = async () => {
  try {
    // First run unit tests
    console.log('\n=== Running Unit Tests ===\n');
    const unitTestResult = await runCommand('tsx', ['scripts/run-tests.ts'], { NODE_OPTIONS: '' });
    
    // Then run e2e tests regardless of unit test results
    console.log('\n=== Running E2E Tests ===\n');
    const e2eTestResult = await runCommand('npx', ['playwright', 'test', '--reporter=list'], { NODE_OPTIONS: '' });
    
    // Exit with non-zero code if either test suite failed
    if (unitTestResult !== 0 || e2eTestResult !== 0) {
      console.error('\n⚠️ Some tests failed. See output above for details.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
};

// Run the tests
runAllTests(); 