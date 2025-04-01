#!/usr/bin/env node
/**
 * This script processes all tsconfig.json files in the project,
 * converting them to standard JSON format without comments.
 * This improves compatibility with IDEs and language servers.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Format tsconfig files
const tsconfigFiles = [
  'tsconfig.json',
  'tsconfig.base.json', 
  'frontend/config/tsconfig.app.json',
  'server/tsconfig.server.json',
  'shared/tsconfig.shared.json'
];

// Color constants
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${CYAN}=== TypeScript Configuration Formatter ===${RESET}\n`);
console.log(`This tool converts TypeScript configuration files to standard JSON format.`);
console.log(`This improves compatibility with IDEs and language servers.\n`);

// More robust tsconfig parsing using a modified approach
function parseTSConfig(filePath) {
  try {
    // Use TypeScript's own parser via the CLI to parse the file
    const tempOutputPath = path.join(projectRoot, 'temp-tsconfig-output.json');
    
    // Create temp directory if it doesn't exist
    const tempDir = path.dirname(tempOutputPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    try {
      // Use tsc to read the config file and output it as JSON
      execSync(`npx tsc --showConfig --project ${filePath} > ${tempOutputPath}`, { 
        stdio: ['pipe', 'pipe', 'pipe'] 
      });
      
      // Read the generated JSON file
      const jsonContent = fs.readFileSync(tempOutputPath, 'utf8');
      const config = JSON.parse(jsonContent);
      
      // Clean up
      fs.unlinkSync(tempOutputPath);
      
      return config;
    } catch (execError) {
      console.log(`${YELLOW}⚠ Could not use TypeScript to parse config. Falling back to manual parsing.${RESET}`);
      // If tsc fails, fall back to manual parsing
    }
    
    // Manual parsing as fallback
    const content = fs.readFileSync(filePath, 'utf8');
    
    // More aggressive comment removal
    let jsonContent = content
      .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove block comments
      .replace(/\/\/.*/g, '')            // Remove line comments
      .replace(/,(\s*[}\]])/g, '$1')     // Remove trailing commas
      .replace(/\s*\/\*.+?\*\/\s*/g, '') // Remove any remaining /* */ comments
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":'); // Ensure property names are quoted
    
    // Add necessary properties based on the file
    const parsed = JSON.parse(jsonContent);
    
    // Read the original file to get extends and other top-level properties
    const originalContent = content.trim();
    const extendsMatch = originalContent.match(/"extends"\s*:\s*"([^"]+)"/);
    if (extendsMatch && !parsed.extends) {
      parsed.extends = extendsMatch[1];
    }
    
    return parsed;
  } catch (error) {
    console.log(`${RED}Error parsing ${filePath}: ${error.message}${RESET}`);
    
    // Last resort: try to parse with Function approach (not recommended but may work)
    try {
      const content = fs.readFileSync(filePath, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .trim();
      
      // extremely unsafe, but a last resort for parsing tsconfig
      // eslint-disable-next-line no-new-func
      const configObj = new Function('return ' + content)();
      return configObj;
    } catch (funcError) {
      console.log(`${RED}All parsing methods failed.${RESET}`);
      return null;
    }
  }
}

// Format JSON with indentation
function formatJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// Backup original file
function backupFile(filePath) {
  const backupPath = `${filePath}.bak`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

// Process each tsconfig file
tsconfigFiles.forEach(configPath => {
  const fullPath = path.join(projectRoot, configPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`${YELLOW}⚠ File not found: ${configPath}${RESET}`);
    return;
  }
  
  console.log(`\nProcessing ${CYAN}${configPath}${RESET}...`);
  
  try {
    // Read the raw content for backup
    const originalContent = fs.readFileSync(fullPath, 'utf8');
    
    // Create backup
    const backupPath = backupFile(fullPath);
    console.log(`${GREEN}✓ Created backup: ${path.basename(backupPath)}${RESET}`);
    
    // Get base configuration explicitly to add necessary configs
    const baseConfig = {
      "compilerOptions": {
        "paths": {}
      }
    };
    
    // Try to read existing file structure
    let parsedConfig;
    try {
      // Try manual fallback method
      const content = originalContent
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim();
      
      parsedConfig = JSON.parse(content);
    } catch (error) {
      console.log(`${YELLOW}⚠ Simple JSON parsing failed, using fallback parser${RESET}`);
      parsedConfig = parseTSConfig(fullPath);
    }
    
    // If all parsing methods failed
    if (!parsedConfig) {
      console.log(`${RED}✗ Could not parse ${configPath}. Skipping.${RESET}`);
      return;
    }
    
    // Merge with base config to ensure structure
    const mergedConfig = { ...baseConfig, ...parsedConfig };
    
    // Ensure compilerOptions and paths exist
    mergedConfig.compilerOptions = mergedConfig.compilerOptions || {};
    mergedConfig.compilerOptions.paths = mergedConfig.compilerOptions.paths || {};
    
    // Ensure shared path mapping exists
    if (!mergedConfig.compilerOptions.paths['@shared/*']) {
      console.log(`${YELLOW}⚠ Adding missing @shared/* path mapping${RESET}`);
      
      // Use relative path based on file location
      if (configPath.startsWith('frontend/')) {
        mergedConfig.compilerOptions.paths['@shared/*'] = ['../../shared/*'];
      } else {
        mergedConfig.compilerOptions.paths['@shared/*'] = ['./shared/*'];
      }
    }
    
    // Write formatted JSON
    fs.writeFileSync(fullPath, formatJson(mergedConfig));
    console.log(`${GREEN}✓ Wrote formatted JSON to ${configPath}${RESET}`);
  } catch (error) {
    console.error(`${RED}Error processing ${configPath}: ${error.message}${RESET}`);
  }
});

console.log(`\n${GREEN}✓ Finished processing TypeScript configuration files${RESET}`);
console.log(`\n${CYAN}Next steps:${RESET}`);
console.log(`1. Run 'pnpm build:references' to rebuild project references`);
console.log(`2. Restart your TypeScript server in your editor`);
console.log(`   - In VS Code: Command+Shift+P > TypeScript: Restart TS Server`);
console.log(`3. Test imports using path aliases (e.g., @shared/models/LessonType)`); 