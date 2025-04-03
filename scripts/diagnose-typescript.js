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

// Helper to parse JSON with comments
function parseJsonWithComments(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`Examining file: ${filePath}`);
    
    // First try direct parsing to see if it works
    try {
      return JSON.parse(content);
    } catch (firstError) {
      // If direct parsing fails, then try to strip comments
      console.log(`${YELLOW}Direct parsing failed, trying to strip comments...${RESET}`);
      
      // Remove comments and try again with a more robust approach
      try {
        // Replace block comments
        let processed = content.replace(/\/\*[\s\S]*?\*\//g, '');
        // Replace line comments that don't interfere with URLs (http://)
        processed = processed.replace(/([^:])\/\/.*$/gm, '$1');
        // Remove trailing commas from objects and arrays
        processed = processed.replace(/,(\s*[}\]])/g, '$1');
        
        return JSON.parse(processed);
      } catch (secondError) {
        console.error(`${RED}Failed to parse JSON after stripping comments:${RESET}`);
        console.error(secondError);
        return null;
      }
    }
  } catch (error) {
    console.error(`${RED}Error reading file:${RESET}`, error);
    return null;
  }
}

// Check TypeScript configuration
console.log(`${CYAN}Checking TypeScript configuration...${RESET}`);
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
const tsconfig = parseJsonWithComments(tsconfigPath);

if (!tsconfig) {
  console.error(`${RED}Failed to parse tsconfig.json${RESET}`);
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
  types: ['vite/client']
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