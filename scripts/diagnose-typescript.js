#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const tempDir = path.join(projectRoot, 'temp');

// Ensure temp directory exists and is empty
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir);

// Color constants for terminal output
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${CYAN}=== TypeScript Configuration Diagnostic Tool ===${RESET}\n`);

// Helper to parse JSON - tsconfig.json should be standard JSON
function parseJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`Examining file: ${filePath}`);
    try {
      // Attempt direct parsing
      return JSON.parse(content);
    } catch (parseError) {
      // If parsing fails, report the specific error
      console.error(`${RED}Failed to parse JSON content from ${filePath}:${RESET}`);
      console.error(parseError); // Log the actual parsing error
      return null;
    }
  } catch (readError) {
    // Handle file reading errors
    console.error(`${RED}Error reading file ${filePath}:${RESET}`, readError);
    return null;
  }
}

// Check TypeScript configuration
console.log(`${CYAN}Checking TypeScript configuration...${RESET}`);
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
// Use the simplified parsing function
const tsconfig = parseJsonFile(tsconfigPath);

if (!tsconfig) {
  console.error(`${RED}Failed to load or parse tsconfig.json${RESET}`); // Updated error message
  process.exit(1);
}

// Validate compiler options
console.log(`\n${CYAN}Validating compiler options...${RESET}`);
const requiredOptions = {
  target: 'ES2022',
  module: 'ES2022',
  moduleResolution: 'bundler',
  jsx: 'react-jsx',
  jsxImportSource: 'react',
  baseUrl: '.',
  paths: {
    '@shared/*': ['shared/*'],
    '@frontend/*': ['frontend/*'],
    '@server/*': ['server/*']
  },
  types: ['vite/client', 'jest']
};

let hasErrors = false;
for (const [key, value] of Object.entries(requiredOptions)) {
  if (!tsconfig.compilerOptions[key]) {
    console.error(`${RED}Missing required compiler option:${RESET} ${key}`);
    hasErrors = true;
  } else if (JSON.stringify(tsconfig.compilerOptions[key]) !== JSON.stringify(value)) {
    console.error(`${RED}Incorrect value for compiler option:${RESET} ${key}`);
    console.error(`Expected: ${JSON.stringify(value)}`);
    console.error(`Found: ${JSON.stringify(tsconfig.compilerOptions[key])}`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓${RESET} ${key} is correctly configured`);
  }
}

// Check include patterns
console.log(`\n${CYAN}Checking include patterns...${RESET}`);
const requiredIncludes = [
  'shared/**/*',
  'frontend/**/*',
  'server/**/*',
  'scripts/**/*'
];

for (const pattern of requiredIncludes) {
  if (!tsconfig.include?.includes(pattern)) {
    console.error(`${RED}Missing required include pattern:${RESET} ${pattern}`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓${RESET} Include pattern ${pattern} is present`);
  }
}

// Check exclude patterns
console.log(`\n${CYAN}Checking exclude patterns...${RESET}`);
const requiredExcludes = [
  'node_modules',
  'dist'
];

for (const pattern of requiredExcludes) {
  if (!tsconfig.exclude?.includes(pattern)) {
    console.error(`${RED}Missing required exclude pattern:${RESET} ${pattern}`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓${RESET} Exclude pattern ${pattern} is present`);
  }
}

// Test TypeScript compilation
console.log(`\n${CYAN}Testing TypeScript compilation...${RESET}`);
try {
  execSync('pnpm typecheck', { stdio: 'inherit' });
  console.log(`${GREEN}✓${RESET} TypeScript compilation successful`);
} catch (error) {
  console.error(`${RED}TypeScript compilation failed${RESET}`);
  hasErrors = true;
}

// Cleanup
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

// Summary
console.log(`\n${CYAN}=== Diagnosis Summary ===${RESET}`);
if (hasErrors) {
  console.log(`${RED}✗${RESET} Found configuration issues that need to be addressed`);
  process.exit(1);
} else {
  console.log(`${GREEN}✓${RESET} TypeScript configuration is valid`);
  process.exit(0);
} 