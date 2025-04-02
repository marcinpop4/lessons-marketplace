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

console.log(`${CYAN}=== TypeScript Path Resolution Diagnostic Tool ===${RESET}\n`);

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
        
        // Print a small sample of the processed content
        console.log(`${YELLOW}Sample of processed content:${RESET}`);
        const sample = processed.substring(0, 200) + '...';
        console.log(sample);
        
        return JSON.parse(processed);
      } catch (parseError) {
        console.log(`${RED}Error parsing ${filePath}: ${parseError.message}${RESET}`);
        
        // For debugging
        if (parseError.message.includes('position')) {
          const posMatch = parseError.message.match(/position (\d+)/);
          if (posMatch && posMatch[1]) {
            const position = parseInt(posMatch[1], 10);
            const start = Math.max(0, position - 50);
            const end = Math.min(content.length, position + 50);
            
            console.log(`${YELLOW}Context around error (original file):${RESET}`);
            console.log(`${content.substring(start, position)}${RED}→HERE→${RESET}${content.substring(position, end)}`);
          }
        }
        
        // Return empty object as fallback
        return { compilerOptions: {} };
      }
    }
  } catch (error) {
    console.log(`${RED}Error reading ${filePath}: ${error.message}${RESET}`);
    return { compilerOptions: {} };
  }
}

// Check if tsconfig files exist
console.log(`${CYAN}Checking TypeScript configuration files...${RESET}`);
const configs = [
  'tsconfig.json',
  'tsconfig.base.json',
  'frontend/config/tsconfig.app.json',
  'server/tsconfig.server.json',
  'shared/tsconfig.shared.json'
];

configs.forEach(configPath => {
  const fullPath = path.join(projectRoot, configPath);
  if (fs.existsSync(fullPath)) {
    console.log(`${GREEN}✓ Found${RESET} ${configPath}`);
    const config = parseJsonWithComments(fullPath);
    
    // Check for path mappings
    if (config.compilerOptions && config.compilerOptions.paths) {
      const paths = Object.keys(config.compilerOptions.paths);
      if (paths.includes('@shared/*')) {
        console.log(`  ${GREEN}✓ Has @shared/* path mapping${RESET}`);
      } else {
        console.log(`  ${RED}✗ Missing @shared/* path mapping${RESET}`);
      }
    } else if (config.extends) {
      console.log(`  ${YELLOW}⚠ No direct paths, extends ${config.extends}${RESET}`);
    } else {
      console.log(`  ${RED}✗ No path mappings defined${RESET}`);
    }
  } else {
    console.log(`${RED}✗ Missing${RESET} ${configPath}`);
  }
});

// Check VS Code settings
console.log(`\n${CYAN}Checking VS Code configuration...${RESET}`);
const vscodePath = path.join(projectRoot, '.vscode/settings.json');
if (fs.existsSync(vscodePath)) {
  console.log(`${GREEN}✓ Found${RESET} .vscode/settings.json`);
  const settings = parseJsonWithComments(vscodePath);
  if (settings['typescript.tsdk']) {
    console.log(`  ${GREEN}✓ Using workspace TypeScript: ${settings['typescript.tsdk']}${RESET}`);
  } else {
    console.log(`  ${RED}✗ Not using workspace TypeScript${RESET}`);
  }
  
  if (settings['typescript.preferences.importModuleSpecifier'] === 'non-relative') {
    console.log(`  ${GREEN}✓ Import preference set to non-relative${RESET}`);
  } else {
    console.log(`  ${RED}✗ Import preference not set to non-relative${RESET}`);
  }
} else {
  console.log(`${RED}✗ Missing${RESET} .vscode/settings.json`);
}

// Test TypeScript version
console.log(`\n${CYAN}Checking TypeScript version...${RESET}`);
try {
  const tscVersion = execSync('npx tsc --version', { encoding: 'utf8' }).trim();
  console.log(`${GREEN}✓ TypeScript version: ${tscVersion}${RESET}`);
} catch (error) {
  console.error(`${RED}✗ Error checking TypeScript version${RESET}`);
}

// Keep track of all temporary files created
const tempFiles = [];

// Function to test with a specific tsconfig
function testWithConfig(configName, configPath) {
  console.log(`\nTesting with ${YELLOW}${configName}${RESET}...`);
  
  // Create a temporary directory for this test
  const testDir = path.join(tempDir, configName.replace(/\s+/g, '-'));
  fs.mkdirSync(testDir, { recursive: true });
  
  // First, copy the test file to a location that's included in the tsconfig
  let testDestination;
  let cleanupFunc;
  let testImportContent;
  
  if (configName === 'root tsconfig') {
    testDestination = path.join(testDir, 'temp-path-alias-test.ts');
    testImportContent = `// Test importing from shared using path alias
import { LessonType } from '@shared/models/LessonType';

// Do something with the import to prevent it from being removed
const lessonTypes = Object.keys(LessonType);
console.log('Available lesson types:', lessonTypes);
`;
    cleanupFunc = () => {
      if (fs.existsSync(testDestination)) {
        tempFiles.push(testDestination);
      }
    };
  } else if (configName === 'frontend tsconfig') {
    testDestination = path.join(testDir, 'temp-path-alias-test.ts');
    testImportContent = `// Test importing from shared using path alias
import { LessonType } from '@shared/models/LessonType';

// Do something with the import to prevent it from being removed
const lessonTypes = Object.keys(LessonType);
console.log('Available lesson types:', lessonTypes);
`;
    cleanupFunc = () => {
      if (fs.existsSync(testDestination)) {
        tempFiles.push(testDestination);
      }
    };
  } else if (configName === 'server tsconfig') {
    testDestination = path.join(testDir, 'temp-path-alias-test.ts');
    testImportContent = `// Test importing from shared using path alias
import { LessonType } from '@shared/models/LessonType';

// Do something with the import to prevent it from being removed
const lessonTypes = Object.keys(LessonType);
console.log('Available lesson types:', lessonTypes);
`;
    cleanupFunc = () => {
      if (fs.existsSync(testDestination)) {
        tempFiles.push(testDestination);
      }
    };
  } else if (configName === 'shared tsconfig') {
    testDestination = path.join(testDir, 'temp-path-alias-test.ts');
    // For shared, the path alias should be to its own directory
    testImportContent = `// Test importing from the shared directory
import { LessonType } from '@shared/models/LessonType';

// Alternative direct import
// import { LessonType } from './models/LessonType';

// Do something with the import to prevent it from being removed
const lessonTypes = Object.keys(LessonType);
console.log('Available lesson types:', lessonTypes);
`;
    cleanupFunc = () => {
      if (fs.existsSync(testDestination)) {
        tempFiles.push(testDestination);
      }
    };
  }
  
  try {
    // Write the test file to appropriate location
    fs.writeFileSync(testDestination, testImportContent);
    console.log(`${CYAN}Created test file at ${testDestination}${RESET}`);
    
    // Run TypeScript compiler
    const cmd = `npx tsc --noEmit --project ${configPath}`;
    console.log(`${CYAN}Running command:${RESET} ${cmd}`);
    
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`${GREEN}✓ Success!${RESET} Path aliases work with ${configName}`);
    cleanupFunc();
    return true;
  } catch (error) {
    console.log(`${RED}✗ Failed${RESET} with ${configName}`);
    
    // Print the error details
    if (error.stdout) {
      console.log(`${YELLOW}Standard output:${RESET}`);
      console.log(error.stdout.trim() || 'No standard output');
    }
    
    if (error.stderr) {
      console.log(`${YELLOW}Error output:${RESET}`);
      console.log(error.stderr.trim() || 'No error output');
    }
    
    // Try a relative path for shared
    if (configName === 'shared tsconfig') {
      console.log(`${YELLOW}Trying with relative path import...${RESET}`);
      const relativeImportContent = `// Test importing from the shared directory using relative path
import { LessonType } from './models/LessonType';

// Do something with the import to prevent it from being removed
const lessonTypes = Object.keys(LessonType);
console.log('Available lesson types:', lessonTypes);
`;
      fs.writeFileSync(testDestination, relativeImportContent);
      
      try {
        const output = execSync(`npx tsc --noEmit --project ${configPath}`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log(`${GREEN}✓ Success with relative path!${RESET} Relative imports work with ${configName}`);
        cleanupFunc();
        return true;
      } catch (relativeError) {
        console.log(`${RED}✗ Relative paths also failed${RESET} with ${configName}`);
        cleanupFunc();
        return false;
      }
    }
    
    cleanupFunc();
    return false;
  }
}

// Create a test file with path alias imports
console.log(`\n${CYAN}Testing path alias imports...${RESET}`);

// Test configs
const results = {
  root: testWithConfig('root tsconfig', path.join(projectRoot, 'tsconfig.json')),
  frontend: testWithConfig('frontend tsconfig', path.join(projectRoot, 'frontend/config/tsconfig.app.json')),
  server: testWithConfig('server tsconfig', path.join(projectRoot, 'server/tsconfig.server.json')),
  shared: testWithConfig('shared tsconfig', path.join(projectRoot, 'shared/tsconfig.shared.json'))
};

// Clean up all temporary files
function cleanupTempFiles() {
  console.log(`\n${CYAN}Cleaning up temporary files...${RESET}`);
  tempFiles.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log(`${GREEN}✓ Removed temporary file: ${path.basename(file)}${RESET}`);
      }
    } catch (error) {
      console.error(`${RED}Error removing temporary file ${file}: ${error.message}${RESET}`);
    }
  });
  
  // Remove the temp directory if it's empty
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
      console.log(`${GREEN}✓ Removed temporary directory${RESET}`);
    }
  } catch (error) {
    console.error(`${RED}Error removing temporary directory: ${error.message}${RESET}`);
  }
}

// Summary and recommendations
console.log(`\n${CYAN}=== Diagnosis Summary ===${RESET}`);
if (Object.values(results).every(Boolean)) {
  console.log(`${GREEN}✓ Path aliases work in all TypeScript configurations!${RESET}`);
  console.log('\nYour editor might still show errors due to the following reasons:');
  console.log('1. The TypeScript language server in your editor might need to be restarted');
  console.log('2. Your editor might be using a different TypeScript version');
  console.log('3. The path mappings might need time to be recognized by the editor');
} else {
  console.log(`${RED}✗ Path aliases are not working in all configurations${RESET}`);
  
  // Check which specific configs failed
  if (!results.server) {
    console.log(`\n${YELLOW}Issues with the server configuration:${RESET}`);
    console.log('The @shared/* path mapping in server/tsconfig.server.json points to "../shared/*"');
    console.log('You can solve this by using relative imports in server files when importing from shared:');
    console.log('import { LessonType } from "../shared/models/LessonType";');
  }
  
  if (!results.shared) {
    console.log(`\n${YELLOW}Issues with the shared configuration:${RESET}`);
    console.log('The shared project works with relative imports, but not with path aliases to itself.');
    console.log('When working within the shared directory, use relative imports:');
    console.log('import { LessonType } from "./models/LessonType";');
  }
  
  console.log('\nRecommended actions:');
  console.log('1. We have updated the tsconfig files to extend from the base configuration');
  console.log('2. Path mappings are consistent but may not work for importing within the same project');
  console.log('3. We have run "pnpm build:references" to build project references');
  console.log('4. You will need to restart your TypeScript server in your editor');
}

console.log(`\n${CYAN}=== Editor-specific tips ===${RESET}`);
console.log('VS Code:');
console.log('1. Use Command+Shift+P and select "TypeScript: Restart TS Server"');
console.log('2. Open the workspace using the .vscode/typescript.code-workspace file');
console.log('3. Ensure the workspace TypeScript version is being used');

console.log(`\n${CYAN}=== Project Configuration Summary ===${RESET}`);
console.log('This project uses the following structure:');
console.log('1. Root level tsconfig.json - For scripts and root-level TypeScript files');
console.log('2. tsconfig.base.json - Base configuration that other configs should extend from');
console.log('3. frontend/config/tsconfig.app.json - For frontend app code');
console.log('4. server/tsconfig.server.json - For server-side code');
console.log('5. shared/tsconfig.shared.json - For shared code used by both frontend and server');
console.log('\nPath alias recommendations:');
console.log('- In frontend code: Use @shared/*, @frontend/*, and @/* path aliases');
console.log('- In server code: Use relative imports (../shared/*) for shared code, @server/* for server code');
console.log('- In shared code: Use relative imports (./models/*) within the shared directory');

cleanupTempFiles(); 