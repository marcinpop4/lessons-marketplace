/**
 * Script to run Jest tests with proper TypeScript support
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Process arguments (pass through any arguments after the script name)
const args = process.argv.slice(2);

// Default to running unit tests if no arguments provided
const testCommand = args.length > 0 ? args : ['tests/unit'];

// Build the full command with all necessary flags
const jestArgs = [
  'jest',
  ...testCommand,
  '--config=jest.config.js', 
  '--detectOpenHandles'
];

console.log(`Running Jest with args: ${jestArgs.join(' ')}`);

const testProcess = spawn('npx', jestArgs, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-vm-modules'
  }
});

testProcess.on('error', (err) => {
  console.error('Failed to run tests:', err);
  process.exit(1);
});

testProcess.on('exit', (code) => {
  process.exit(code || 0);
}); 