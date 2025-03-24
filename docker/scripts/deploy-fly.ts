#!/usr/bin/env tsx

/**
 * This script deploys the application to fly.io.
 * It builds the application and deploys the server and frontend.
 * All configuration is read from the fly TOML files.
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for better output
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const NC = '\x1b[0m'; // No Color

// Command line options
const isProduction = process.argv.includes('--production');
const skipBuild = process.argv.includes('--skip-build');
const skipMigrations = process.argv.includes('--skip-migrations');
const skipServer = process.argv.includes('--skip-server');
const skipFrontend = process.argv.includes('--skip-frontend');
const skipSecretsCheck = process.argv.includes('--skip-secrets-check');

// Application names on fly.io
const SERVER_APP = 'lessons-marketplace-server';
const FRONTEND_APP = 'lessons-marketplace-frontend';

// Define paths
const serverToml = join(__dirname, '..', 'fly-config', 'fly.server.toml');
const frontendToml = join(__dirname, '..', 'fly-config', 'fly.frontend.toml');
const rootDir = join(__dirname, '..', '..');

// Determine the fly CLI command to use
function getFlyCommand(): string {
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
        console.error(`${RED}Error: Could not find fly or flyctl command${NC}`);
        console.error(`${RED}Please install the Fly CLI tool:${NC}`);
        console.error(`${CYAN}curl -L https://fly.io/install.sh | sh${NC}`);
        process.exit(1);
      }
    }
  }
}

const flyCommand = getFlyCommand();
console.log(`${GREEN}Using Fly CLI command: ${flyCommand}${NC}`);

// Helper function to execute commands asynchronously
async function execAsync(command: string, options: { silent?: boolean; showCommand?: boolean; stdio?: 'inherit' | 'pipe' | 'ignore' } = {}): Promise<string> {
  const { silent = false, showCommand = true, stdio = 'inherit' } = options;
  
  if (showCommand) {
    console.log(`${CYAN}> ${command}${NC}`);
  }
  
  try {
    // Create a copy of the environment variables
    const env = { ...process.env };
    
    // Handle NODE_OPTIONS that might cause issues
    if (env.NODE_OPTIONS) {
      const originalOptions = env.NODE_OPTIONS;
      
      // Remove problematic flags like --no-experimental-fetch
      env.NODE_OPTIONS = originalOptions
        .split(' ')
        .filter(opt => !opt.includes('experimental-fetch'))
        .join(' ');
      
      if (env.NODE_OPTIONS !== originalOptions) {
        console.log(`${YELLOW}Modified NODE_OPTIONS from "${originalOptions}" to "${env.NODE_OPTIONS}"${NC}`);
      }
      
      // If we've removed all options, delete the variable
      if (!env.NODE_OPTIONS.trim()) {
        console.log(`${YELLOW}All NODE_OPTIONS were removed, unsetting the variable${NC}`);
        delete env.NODE_OPTIONS;
      }
    }
    
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio,
      env
    });
    
    return output || '';
  } catch (error) {
    console.error(`${RED}Error executing command: ${command}${NC}`);
    throw error;
  }
}

// Helper function to get fly.io secrets
async function secretExists(secretName: string, appName: string): Promise<boolean> {
  try {
    // Get the list of secrets - use a more direct approach
    const rawOutput = await execAsync(`${flyCommand} secrets list -a ${appName} | grep -w "^${secretName} "`, { 
      silent: true, 
      showCommand: true,
      stdio: 'pipe' 
    }).catch(() => ''); // If grep finds nothing, it exits with non-zero status
    
    // Any output means the secret exists
    const exists = rawOutput.trim().length > 0;
    
    if (exists) {
      console.log(`${GREEN}Secret ${secretName} found${NC}`);
      return true;
    } else {
      // Double-check by getting all secrets and logging them
      console.log(`${YELLOW}Double-checking for ${secretName}...${NC}`);
      const allSecrets = await execAsync(`${flyCommand} secrets list -a ${appName}`, {
        silent: true,
        showCommand: true,
        stdio: 'pipe'
      });
      
      console.log(`${YELLOW}All secrets for ${appName}:${NC}`);
      console.log(allSecrets);
      
      // Manual check through all secrets output
      const secretLines = allSecrets.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('NAME'));
        
      for (const line of secretLines) {
        // Split by whitespace and check first column
        const parts = line.split(/\s+/);
        if (parts.length > 0 && parts[0] === secretName) {
          console.log(`${GREEN}Found secret ${secretName} through manual check${NC}`);
          return true;
        }
      }
      
      console.log(`${RED}Secret ${secretName} not found${NC}`);
      return false;
    }
  } catch (error) {
    console.error(`${RED}Failed to check for secret ${secretName}: ${error}${NC}`);
    // Return false to indicate the secret wasn't found due to error
    return false;
  }
}

// Check if fly.toml files exist
if (!fs.existsSync(serverToml)) {
  console.error(`${RED}Error: Server fly.toml file not found at ${serverToml}${NC}`);
  process.exit(1);
}

if (!fs.existsSync(frontendToml)) {
  console.error(`${RED}Error: Frontend fly.toml file not found at ${frontendToml}${NC}`);
  process.exit(1);
}

// Debug the PATH environment variable
console.log(`${YELLOW}Current PATH: ${process.env.PATH}${NC}`);

// Check if user is logged in to fly.io
console.log(`${YELLOW}Checking fly.io authentication...${NC}`);
try {
  await execAsync(`${flyCommand} auth whoami`, { stdio: 'pipe' });
  console.log(`${GREEN}Successfully authenticated with fly.io${NC}`);
} catch (error) {
  console.error(`${RED}Error during authentication: ${error}${NC}`);
  console.error(`${RED}Error: You are not logged in to fly.io. Please login first:${NC}`);
  console.log(`${CYAN}${flyCommand} auth login${NC}`);
  process.exit(1);
}

// Build the application if not skipped
if (!skipBuild) {
  console.log(`\n${YELLOW}=== BUILDING APPLICATION ===${NC}`);
  
  try {
    // Check if the separate build scripts exist in package.json
    const packageJsonPath = join(rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const hasSharedBuild = 'build:shared' in packageJson.scripts;
    const hasServerBuild = 'build:server' in packageJson.scripts;
    const hasFrontendBuild = 'build:frontend' in packageJson.scripts;
    
    if (hasSharedBuild && hasServerBuild && hasFrontendBuild) {
      // If separate build scripts exist, use them
      console.log(`${YELLOW}Building shared code...${NC}`);
      await execAsync('pnpm run build:shared');
      
      console.log(`${YELLOW}Building server...${NC}`);
      await execAsync('pnpm run build:server');
      
      console.log(`${YELLOW}Building frontend...${NC}`);
      if (isProduction) {
        process.env.NODE_ENV = 'production';
      }
      await execAsync('pnpm run build:frontend');
    } else {
      // Fall back to the main build script
      console.log(`${YELLOW}Building all components with main build script...${NC}`);
      if (isProduction) {
        process.env.NODE_ENV = 'production';
      }
      await execAsync('pnpm run build');
    }
    
    console.log(`${GREEN}Build completed successfully.${NC}`);
  } catch (error) {
    console.error(`${RED}Error during build: ${error}${NC}`);
    throw error;
  }
} else {
  console.log(`${YELLOW}Skipping build step...${NC}`);
}

// Main function
async function main() {
  console.log(`\n${YELLOW}========================================${NC}`);
  console.log(`${YELLOW}=== STARTING FLY.IO DEPLOYMENT PROCESS ===${NC}`);
  console.log(`${YELLOW}========================================${NC}`);
  console.log(`${YELLOW}Environment: ${isProduction ? 'PRODUCTION' : 'Development'}${NC}`);
  console.log(`${YELLOW}Using configuration from fly TOML files${NC}`);
  
  try {
    if (!skipServer) {
      // Deploy server first
      console.log(`\n${YELLOW}=== DEPLOYING SERVER ===${NC}`);

      // Verify required secrets exist
      console.log(`${YELLOW}Verifying required secrets exist...${NC}`);
      const hasDbPassword = await secretExists('DB_PASSWORD', SERVER_APP);
      const hasJwtSecret = await secretExists('JWT_SECRET', SERVER_APP);
      
      const missingSecrets: string[] = [];
      if (!hasDbPassword) missingSecrets.push('DB_PASSWORD');
      if (!hasJwtSecret) missingSecrets.push('JWT_SECRET');
      
      if (missingSecrets.length > 0) {
        console.error(`${RED}Error: The following required secrets are missing: ${missingSecrets.join(', ')}${NC}`);
        console.error(`${RED}Please set these secrets manually using:${NC}`);
        for (const secret of missingSecrets) {
          console.log(`${CYAN}${flyCommand} secrets set ${secret}=your_${secret.toLowerCase()} -a ${SERVER_APP}${NC}`);
        }
        process.exit(1);
      }
      
      console.log(`${GREEN}All required secrets verified.${NC}`);

      // Run migrations if not skipped
      if (!skipMigrations) {
        console.log(`${YELLOW}Migrations will run automatically during server deployment.${NC}`);
        console.log(`${YELLOW}(via release_command in fly.toml)${NC}`);
      } else {
        console.log(`${YELLOW}Skipping database migrations...${NC}`);
      }

      // Deploy the server code
      console.log(`\n${YELLOW}Deploying server code to fly.io...${NC}`);
      console.log(`${YELLOW}This may take a few minutes...${NC}`);

      // Copy the original fly config file to the project root
      const tempServerToml = join(rootDir, 'fly.toml');
      console.log(`${YELLOW}Copying fly configuration to project root...${NC}`);
      fs.copyFileSync(serverToml, tempServerToml);
      console.log(`${GREEN}Configuration copied to: ${tempServerToml}${NC}`);

      try {
        // Deploy from the project root with the default fly.toml
        console.log(`${YELLOW}Deploying server from project root...${NC}`);
        await execAsync(`cd ${rootDir} && ${flyCommand} deploy -a ${SERVER_APP}`);
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempServerToml)) {
          fs.unlinkSync(tempServerToml);
          console.log(`${YELLOW}Removed temporary fly.toml file${NC}`);
        }
      }

      console.log(`${GREEN}Server deployed successfully!${NC}`);
      console.log(`${GREEN}Server URL: https://${SERVER_APP}.fly.dev${NC}`);
    } else {
      console.log(`${YELLOW}Skipping server deployment...${NC}`);
    }
    
    if (!skipFrontend) {
      // Deploy the frontend
      console.log(`\n${YELLOW}=== DEPLOYING FRONTEND ===${NC}`);

      // Deploy the frontend code
      console.log(`\n${YELLOW}Deploying frontend code to fly.io...${NC}`);
      console.log(`${YELLOW}This may take a few minutes...${NC}`);

      // After server deployment, rename the frontend toml to fly.toml at project root
      const tempFrontendToml = join(rootDir, 'fly.toml');
      console.log(`${YELLOW}Copying frontend fly configuration to project root...${NC}`);
      fs.copyFileSync(frontendToml, tempFrontendToml);
      console.log(`${GREEN}Configuration copied to: ${tempFrontendToml}${NC}`);

      try {
        // Deploy from the project root with the default fly.toml
        console.log(`${YELLOW}Deploying frontend from project root...${NC}`);
        await execAsync(`cd ${rootDir} && ${flyCommand} deploy -a ${FRONTEND_APP}`);
      } finally {
        // Clean up temp file
        if (fs.existsSync(tempFrontendToml)) {
          fs.unlinkSync(tempFrontendToml);
          console.log(`${YELLOW}Removed temporary fly.toml file${NC}`);
        }
      }

      console.log(`${GREEN}Frontend deployed successfully!${NC}`);
      console.log(`${GREEN}Frontend URL: https://${FRONTEND_APP}.fly.dev${NC}`);
    } else {
      console.log(`${YELLOW}Skipping frontend deployment...${NC}`);
    }
    
    console.log(`\n${GREEN}========================================${NC}`);
    console.log(`${GREEN}=== DEPLOYMENT COMPLETED SUCCESSFULLY ===${NC}`);
    console.log(`${GREEN}========================================${NC}`);
    console.log(`${GREEN}Server: https://${SERVER_APP}.fly.dev${NC}`);
    console.log(`${GREEN}Frontend: https://${FRONTEND_APP}.fly.dev${NC}`);
    console.log(`${GREEN}Deployment completed at: ${new Date().toLocaleString()}${NC}`);
  } catch (error) {
    console.error(`\n${RED}========================================${NC}`);
    console.error(`${RED}=== DEPLOYMENT FAILED ===${NC}`);
    console.error(`${RED}========================================${NC}`);
    console.error(`${RED}Error: ${error}${NC}`);
    process.exit(1);
  }
}

// Execute main function
main().catch(error => {
  console.error(`${RED}Unhandled error: ${error}${NC}`);
  process.exit(1);
}); 