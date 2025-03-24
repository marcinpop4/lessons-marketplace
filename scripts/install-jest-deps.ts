/**
 * Script to install Jest dependencies for unit testing
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const dependencies = [
  'jest',
  '@jest/globals',
  'ts-jest',
  '@testing-library/jest-dom',
  '@types/jest',
  'jest-environment-jsdom'
];

// Spawn pnpm install process
const installProcess = spawn('pnpm', ['add', '-D', ...dependencies], {
  cwd: rootDir,
  stdio: 'inherit'
});

installProcess.on('error', (err) => {
  console.error('Failed to install Jest dependencies:', err);
  process.exit(1);
});

installProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('Successfully installed Jest dependencies');
  } else {
    console.error(`Installation failed with code ${code || 1}`);
    process.exit(code || 1);
  }
}); 