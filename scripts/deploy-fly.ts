import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ANSI color codes
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No Color

// Check for command line arguments
const withDatabase = process.argv.includes('--with-db');

// Function to execute shell commands and handle errors
function runCommand(command: string, errorMessage: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' });
  } catch (error) {
    console.error(`${RED}${errorMessage}${NC}`);
    process.exit(1);
  }
  return '';
}

// Function to check if a command exists
function commandExists(command: string): boolean {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Function to get user input
function getUserInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to get masked input (for passwords)
function getMaskedInput(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    process.stdout.write(question);
    
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode(true);
    stdin.resume();
    
    let password = '';
    stdin.on('data', (data) => {
      const char = data.toString();
      
      // On Enter key
      if (char === '\r' || char === '\n') {
        process.stdout.write('\n');
        stdin.setRawMode(false);
        stdin.pause();
        rl.close();
        resolve(password);
      } 
      // On CTRL+C or CTRL+D
      else if (char === '\u0003' || char === '\u0004') {
        process.exit(0);
      }
      // On backspace
      else if (char === '\u007f') {
        if (password.length > 0) {
          password = password.substring(0, password.length - 1);
          process.stdout.write('\b \b');
        }
      }
      // Regular character
      else {
        password += char;
        process.stdout.write('*');
      }
    });
  });
}

// Function to create a Postgres database in Fly.io
async function createFlyPostgresDatabase(appName: string): Promise<string> {
  console.log(`${YELLOW}Setting up PostgreSQL database for ${appName}...${NC}`);
  
  // Generate a unique database name based on the app name
  const dbName = `${appName}-db`;
  
  try {
    // Check if postgres app already exists
    const pgList = execSync('flyctl postgres list', { encoding: 'utf-8' });
    if (pgList.includes(dbName)) {
      console.log(`${YELLOW}Database ${dbName} already exists, skipping creation.${NC}`);
      
      // Extract the database connection string
      const attachInfo = execSync(`flyctl postgres attach --app ${appName} ${dbName}`, { encoding: 'utf-8' });
      console.log(`${GREEN}Successfully attached database to app.${NC}`);
      
      return dbName;
    }
    
    // Create a new Postgres database
    console.log(`${YELLOW}Creating new Postgres database: ${dbName}...${NC}`);
    
    // Ask user for database size/plan
    const dbPlan = await getUserInput("Choose database plan (development/hobby/starter/basic-0): ");
    const plan = dbPlan.trim() || "development";
    
    // Create the database
    execSync(`flyctl postgres create --name ${dbName} --region ewr --vm-size ${plan}`, { stdio: 'inherit' });
    
    // Attach the database to the app
    execSync(`flyctl postgres attach --app ${appName} ${dbName}`, { stdio: 'inherit' });
    
    console.log(`${GREEN}Successfully created and attached database to app.${NC}`);
    return dbName;
  } catch (error) {
    console.error(`${RED}Error setting up database: ${error}${NC}`);
    process.exit(1);
  }
}

// Main deployment function
async function deployToFly(): Promise<void> {
  console.log(`${YELLOW}Starting deployment to Fly.io with consolidated Dockerfile...${NC}`);

  // Check if Fly CLI is installed
  if (!commandExists('flyctl')) {
    console.error(`${RED}Fly CLI is not installed. Please install it first:${NC}`);
    console.error(`${YELLOW}curl -L https://fly.io/install.sh | sh${NC}`);
    process.exit(1);
  }

  // Check if user is authenticated with Fly
  try {
    execSync('flyctl auth whoami', { stdio: 'ignore' });
  } catch {
    console.error(`${RED}You are not authenticated with Fly.io. Please login first:${NC}`);
    console.error(`${YELLOW}flyctl auth login${NC}`);
    process.exit(1);
  }

  // Confirm deployment
  const answer = await getUserInput(`This will deploy both server and frontend to Fly.io${withDatabase ? ' with a new database' : ''}. Continue? (y/n) `);
  if (!answer.toLowerCase().startsWith('y')) {
    console.log(`${YELLOW}Deployment canceled.${NC}`);
    process.exit(0);
  }

  // Ensure environment variables are properly set
  const envProductionPath = '.env.production';
  if (!fs.existsSync(envProductionPath)) {
    console.error(`${RED}Missing .env.production file. Please create it first.${NC}`);
    process.exit(1);
  }

  // Load environment variables from .env.production
  const envConfig = dotenv.config({ path: envProductionPath });
  if (envConfig.error) {
    console.error(`${RED}Error loading .env.production file: ${envConfig.error.message}${NC}`);
    process.exit(1);
  }

  // Define required environment variables
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME', 
    'DB_USER',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'REFRESH_TOKEN_EXPIRES_IN',
    'FRONTEND_URL',
    'VITE_API_BASE_URL'
  ];

  // Check for missing required variables
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`${RED}Missing required environment variables in .env.production:${NC}`);
    console.error(`${RED}${missingVars.join(', ')}${NC}`);
    console.error(`${RED}Please set these variables in your .env.production file${NC}`);
    process.exit(1);
  }

  console.log(`${GREEN}All required environment variables found in .env.production${NC}`);

  // App names
  const SERVER_APP = "lessons-marketplace-server";
  const FRONTEND_APP = "lessons-marketplace-frontend";

  // Deploy server first
  console.log(`\n${YELLOW}Deploying server to Fly.io...${NC}`);

  // Check if we need to create the server app
  try {
    const appsList = execSync('flyctl apps list', { encoding: 'utf-8' });
    if (!appsList.includes(SERVER_APP)) {
      console.log(`${YELLOW}Creating new Fly app for server...${NC}`);
      execSync(`flyctl apps create "${SERVER_APP}" --org personal`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error(`${RED}Error checking or creating server app: ${error}${NC}`);
    process.exit(1);
  }

  // If --with-db flag was provided, create a Postgres database
  if (withDatabase) {
    const dbName = await createFlyPostgresDatabase(SERVER_APP);
    console.log(`${GREEN}Database ${dbName} ready and attached to app.${NC}`);
  }

  // Check for DB_PASSWORD
  if (!process.env.DB_PASSWORD) {
    console.log(`${YELLOW}DB_PASSWORD not found in .env.production, prompting for input...${NC}`);
    const password = await getMaskedInput(`Enter value for DB_PASSWORD: `);
    if (!password) {
      console.error(`${RED}DB_PASSWORD is required. Exiting.${NC}`);
      process.exit(1);
    }
    process.env.DB_PASSWORD = password;
  }

  // Set all required environment variables as secrets
  try {
    console.log(`${YELLOW}Setting required environment variables as secrets...${NC}`);
    
    // Required secrets for server
    const serverSecrets = [
      'DB_PASSWORD',
      'JWT_SECRET',
      'JWT_EXPIRES_IN',
      'REFRESH_TOKEN_EXPIRES_IN',
      'FRONTEND_URL'
    ];
    
    for (const secret of serverSecrets) {
      const value = process.env[secret];
      if (value) {
        console.log(`${YELLOW}Setting ${secret} for server app${NC}`);
        execSync(`flyctl secrets set "${secret}=${value}" -a "${SERVER_APP}"`, { stdio: 'inherit' });
      }
    }
  } catch (error) {
    console.error(`${RED}Error setting environment variables: ${error}${NC}`);
    process.exit(1);
  }

  // Deploy the server
  console.log(`${YELLOW}Deploying server...${NC}`);
  try {
    execSync('flyctl deploy -c fly.server.toml --remote-only', { stdio: 'inherit' });
  } catch (error) {
    console.error(`${RED}Error deploying server: ${error}${NC}`);
    process.exit(1);
  }

  // Wait for server to be ready
  console.log(`${YELLOW}Waiting for server to be ready...${NC}`);
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Deploy frontend
  console.log(`\n${YELLOW}Deploying frontend to Fly.io...${NC}`);

  // Check if we need to create the frontend app
  try {
    const appsList = execSync('flyctl apps list', { encoding: 'utf-8' });
    if (!appsList.includes(FRONTEND_APP)) {
      console.log(`${YELLOW}Creating new Fly app for frontend...${NC}`);
      execSync(`flyctl apps create "${FRONTEND_APP}" --org personal`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error(`${RED}Error checking or creating frontend app: ${error}${NC}`);
    process.exit(1);
  }

  // Set environment variables for frontend
  try {
    console.log(`${YELLOW}Setting environment variables for frontend...${NC}`);
    
    // API URL is required for frontend
    const apiBaseUrl = process.env.VITE_API_BASE_URL;
    if (apiBaseUrl) {
      console.log(`${YELLOW}Setting VITE_API_BASE_URL for frontend app${NC}`);
      execSync(`flyctl secrets set "VITE_API_BASE_URL=${apiBaseUrl}" -a "${FRONTEND_APP}"`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error(`${RED}Error setting environment variables: ${error}${NC}`);
    process.exit(1);
  }

  // Deploy the frontend
  console.log(`${YELLOW}Deploying frontend...${NC}`);
  try {
    execSync('flyctl deploy -c fly.frontend.toml --remote-only', { stdio: 'inherit' });
  } catch (error) {
    console.error(`${RED}Error deploying frontend: ${error}${NC}`);
    process.exit(1);
  }

  console.log(`\n${GREEN}Deployment completed successfully!${NC}`);
  console.log(`${GREEN}Server URL: https://${SERVER_APP}.fly.dev${NC}`);
  console.log(`${GREEN}Frontend URL: https://${FRONTEND_APP}.fly.dev${NC}`);

  // Final instructions
  console.log(`\n${YELLOW}Important next steps:${NC}`);
  console.log(`1. Visit the frontend URL to verify it's working: https://${FRONTEND_APP}.fly.dev`);
  console.log(`2. If you encounter any issues, check the logs with: flyctl logs -a ${SERVER_APP} or flyctl logs -a ${FRONTEND_APP}`);
  console.log(`3. For database commands: flyctl postgres connect -a ${SERVER_APP}`);
}

// Start the deployment process
deployToFly().catch(error => {
  console.error(`${RED}Unexpected error during deployment: ${error}${NC}`);
  process.exit(1);
}); 