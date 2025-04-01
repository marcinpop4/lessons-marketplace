#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('Verifying TypeScript path resolution...');

// Create a temporary test file using path aliases
const tempDir = path.join(projectRoot, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const testFilePath = path.join(tempDir, 'path-test.ts');
const testContent = `
// Test importing from shared using path alias
import { LessonType } from '@shared/models/LessonType';

// Use the imported type to ensure it's not removed by tree-shaking
console.log('Available lesson types:', Object.keys(LessonType));
`;

fs.writeFileSync(testFilePath, testContent);
console.log(`Created test file at ${testFilePath}`);

// Test TypeScript compilation with different configs
const configs = [
  'frontend/config/tsconfig.app.json',
  'server/tsconfig.server.json',
  'shared/tsconfig.shared.json'
];

let allSuccess = true;

configs.forEach(config => {
  const configPath = path.join(projectRoot, config);
  console.log(`\nTesting with config: ${config}`);
  
  try {
    const output = execSync(`npx tsc --noEmit --project ${configPath} ${testFilePath}`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'] 
    });
    console.log(`✅ Success with ${config}`);
  } catch (error) {
    console.error(`❌ Failed with ${config}:`);
    console.error(error.stderr || error.message);
    allSuccess = false;
  }
});

// Clean up
fs.unlinkSync(testFilePath);
fs.rmdirSync(tempDir);

if (allSuccess) {
  console.log('\n✅ All TypeScript path configurations are working correctly.');
} else {
  console.error('\n❌ Some TypeScript path configurations failed.');
  console.log('\nSuggested fixes:');
  console.log('1. Make sure your IDE is using the correct TypeScript version (workspace)');
  console.log('2. Check that path mappings in tsconfig files are consistent');
  console.log('3. Try restarting your TypeScript server in your IDE');
  console.log('4. Run "pnpm build:references" to ensure project references are built');
  process.exit(1);
} 