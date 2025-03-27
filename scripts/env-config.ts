#!/usr/bin/env tsx
/**
 * Environment Configuration Management Script
 * 
 * This script manages environment configurations across different environments.
 * It can:
 * - Generate .env files for local development
 * - Generate Docker environment files
 * - Generate Fly.io configuration files
 * - Set Fly.io secrets
 * 
 * Usage:
 * - pnpm env:dev [outputDir]   (Generate .env for development)
 * - pnpm env:docker [outputDir] (Generate Docker environment directly in outputDir)
 * - pnpm env:prod [outputDir]  (Generate production environment)
 * - pnpm env:fly-config [outputDir] (Generate Fly.io config)
 * - pnpm env:fly-server (Set Fly.io server secrets)
 * - pnpm env:fly-frontend (Set Fly.io frontend secrets)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { parse } from 'dotenv';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default root directory is the project root
const rootDir = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const targetEnv = args[0] || process.env.NODE_ENV || 'development';
const outputDir = args[1] || rootDir; // Optional 2nd argument for output directory

// Map environment to appropriate generation mode
let generateMode: string;
if (targetEnv.startsWith('fly-')) {
  // For Fly.io operations, use the full targetEnv as the mode
  generateMode = targetEnv;
} else {
  // For regular environments, use appropriate mode based on environment
  generateMode = targetEnv === 'docker' ? 'docker' : 'env';
}

// Determine the actual environment name for loading env files
const actualEnv = targetEnv.startsWith('fly-') ? 'production' : targetEnv;

// ANSI color codes for better output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m'; // No Color

// Paths to environment files (input)
const ENV_DIR = path.resolve(rootDir, 'env');
const BASE_ENV_PATH = path.join(ENV_DIR, '.env.base');
const ENV_PATH = path.join(ENV_DIR, `.env.${actualEnv}`);

// Paths to fly.toml templates
const SERVER_TEMPLATE_PATH = path.join(__dirname, 'templates/fly.server.template.toml');
const FRONTEND_TEMPLATE_PATH = path.join(__dirname, 'templates/fly.frontend.template.toml');

// Print the current configuration for debugging
console.log(`${YELLOW}Environment script configuration:${NC}`);
console.log(`${YELLOW}- Target: ${targetEnv}${NC}`);
console.log(`${YELLOW}- Actual environment: ${actualEnv}${NC}`);
console.log(`${YELLOW}- Generate mode: ${generateMode}${NC}`);
console.log(`${YELLOW}- Root directory (for input): ${rootDir}${NC}`);
console.log(`${YELLOW}- Output directory: ${outputDir}${NC}`);
console.log(`${YELLOW}- Input env files: ${BASE_ENV_PATH}, ${ENV_PATH}${NC}`);

/**
 * Loads environment variables from base and target environment files
 */
function loadEnvironment(env: string): Record<string, string> {
  console.log(`${YELLOW}Loading base and ${env} environment variables...${NC}`);
  
  // Check if required files exist
  if (!fs.existsSync(BASE_ENV_PATH)) {
    throw new Error(`Base environment file not found: ${BASE_ENV_PATH}`);
  }
  
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Environment file not found: ${ENV_PATH}`);
  }

  // Parse environment files
  const baseEnv = parse(fs.readFileSync(BASE_ENV_PATH, 'utf-8'));
  const targetEnv = parse(fs.readFileSync(ENV_PATH, 'utf-8'));
  
  // Merge environments (target overrides base)
  const mergedEnv = { ...baseEnv, ...targetEnv };
  
  console.log(`${GREEN}Loaded ${Object.keys(mergedEnv).length} environment variables${NC}`);
  
  return mergedEnv;
}

/**
 * Generates a .env file for local development
 */
function generateEnvFile(config: Record<string, string>, envPath: string): void {
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
}

/**
 * Generates a Docker environment file at the specified path
 */
function generateDockerConfig(config: Record<string, string>, dockerEnvPath: string): void {
  // Generate environment file for Docker
  const dockerEnvContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Ensure directory exists
  const dir = path.dirname(dockerEnvPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(dockerEnvPath, dockerEnvContent);
}

/**
 * Sets Fly.io secrets
 */
function setFlySecrets(config: Record<string, string>, appName: string): void {
  console.log(`${YELLOW}Setting secrets for Fly.io app: ${appName}${NC}`);
  
  // Identify sensitive variables that should be set as secrets
  const sensitiveKeys = ['POSTGRES_PASSWORD', 'JWT_SECRET'];
  
  // Find fly command
  const flyCommand = getFlyCommand();
  if (!flyCommand) {
    console.error(`${RED}Error: Could not find fly or flyctl command${NC}`);
    process.exit(1);
  }
  
  for (const key of sensitiveKeys) {
    if (config[key]) {
      try {
        // Set each secret individually
        execSync(`${flyCommand} secrets set ${key}=${config[key]} --app ${appName}`, { 
          stdio: 'pipe' 
        });
        console.log(`${GREEN}Set Fly.io secret: ${key}${NC}`);
      } catch (error) {
        console.error(`${RED}Failed to set Fly.io secret ${key}: ${error}${NC}`);
      }
    } else {
      console.log(`${YELLOW}Skipping secret ${key} - not found in environment${NC}`);
    }
  }
}

/**
 * Generates fly.toml files from templates using environment variables
 */
function generateFlyConfig(
  config: Record<string, string>,
  serverTomlPath: string,
  frontendTomlPath: string
): void {
  console.log(`${YELLOW}Generating Fly.io configuration files...${NC}`);
  
  // Make sure template files exist
  if (!fs.existsSync(SERVER_TEMPLATE_PATH)) {
    throw new Error(`Server template not found: ${SERVER_TEMPLATE_PATH}`);
  }
  
  if (!fs.existsSync(FRONTEND_TEMPLATE_PATH)) {
    throw new Error(`Frontend template not found: ${FRONTEND_TEMPLATE_PATH}`);
  }

  // Read template files
  let serverTemplate = fs.readFileSync(SERVER_TEMPLATE_PATH, 'utf8');
  let frontendTemplate = fs.readFileSync(FRONTEND_TEMPLATE_PATH, 'utf8');

  // Replace placeholders with actual values
  for (const [key, value] of Object.entries(config)) {
    const placeholder = `{{${key}}}`;
    serverTemplate = serverTemplate.replace(new RegExp(placeholder, 'g'), value);
    frontendTemplate = frontendTemplate.replace(new RegExp(placeholder, 'g'), value);
  }

  // Ensure directory exists
  const dir = path.dirname(serverTomlPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write generated files
  fs.writeFileSync(serverTomlPath, serverTemplate);
  fs.writeFileSync(frontendTomlPath, frontendTemplate);
}

/**
 * Determine the fly CLI command to use
 */
function getFlyCommand(): string | null {
  try {
    // Try 'fly' first
    execSync('fly version', { stdio: 'pipe' });
    return 'fly';
  } catch (e) {
    try {
      // Then try 'flyctl'
      execSync('flyctl version', { stdio: 'pipe' });
      return 'flyctl';
    } catch (e) {
      // Try homebrew path
      try {
        execSync('/opt/homebrew/bin/fly version', { stdio: 'pipe' });
        return '/opt/homebrew/bin/fly';
      } catch (e) {
        return null;
      }
    }
  }
}

// Main execution
try {
  console.log(`${CYAN}======================================${NC}`);
  console.log(`${CYAN}Environment Configuration: ${targetEnv}${NC}`);
  console.log(`${CYAN}Mode: ${generateMode}${NC}`);
  console.log(`${CYAN}Output directory: ${outputDir}${NC}`);
  console.log(`${CYAN}======================================${NC}`);
  
  const config = loadEnvironment(actualEnv);
  
  // Keep track of created files
  const createdFiles: string[] = [];
  
  // Generate configuration based on mode
  switch (generateMode) {
    case 'development':
    case 'test':
    case 'production':
    case 'env':
      const envPath = path.resolve(outputDir, '.env');
      generateEnvFile(config, envPath);
      createdFiles.push(envPath);
      break;
    case 'docker':
      // For Docker mode, generate the .env file directly in the specified output directory
      const dockerEnvPath = path.resolve(outputDir, '.env');
      generateDockerConfig(config, dockerEnvPath);
      createdFiles.push(dockerEnvPath);
      break;
    case 'fly-config':
      const serverTomlPath = path.resolve(outputDir, 'docker/fly-config/fly.server.toml');
      const frontendTomlPath = path.resolve(outputDir, 'docker/fly-config/fly.frontend.toml');
      generateFlyConfig(config, serverTomlPath, frontendTomlPath);
      createdFiles.push(serverTomlPath, frontendTomlPath);
      break;
    case 'fly-server':
      setFlySecrets(config, 'lessons-marketplace-server');
      break;
    case 'fly-frontend':
      setFlySecrets(config, 'lessons-marketplace-frontend');
      break;
    default:
      console.error(`${RED}Unknown target: ${targetEnv}${NC}`);
      process.exit(1);
  }
  
  // Print summary of what was created
  if (createdFiles.length > 0) {
    console.log(`${CYAN}======================================${NC}`);
    console.log(`${CYAN}Summary of created files:${NC}`);
    
    // Display files with appropriate labels based on the generate mode
    for (const file of createdFiles) {
      let fileType = '';
      if (file.endsWith('.env')) {
        fileType = generateMode === 'docker' ? 'Docker environment file' : 'Environment file';
      } else if (file.includes('fly-config')) {
        fileType = file.includes('server') ? 'Fly.io server config' : 'Fly.io frontend config';
      }
      
      console.log(`${GREEN}${fileType}: ${file}${NC}`);
    }
    
    console.log(`${CYAN}======================================${NC}`);
  }
  
  console.log(`${GREEN}Environment configuration completed successfully${NC}`);
} catch (error) {
  console.error(`${RED}Environment configuration failed:${NC}`, error);
  process.exit(1);
} 