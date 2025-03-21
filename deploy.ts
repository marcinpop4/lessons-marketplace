import { execSync } from 'child_process';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as os from 'os';

// ANSI color codes
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m'; // No color

// Function to execute shell commands and handle errors
function runCommand(command: string, errorMessage: string): void {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`${RED}${errorMessage}${NC}`);
    process.exit(1);
  }
}

// Function to execute commands and return output
function runCommandWithOutput(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' });
  } catch (error) {
    return '';
  }
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

// Function to check if a file exists
function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Function to generate a secure password
function generateSecurePassword(length = 24): string {
  // Using a smaller set of special characters to avoid shell escaping issues
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_#$%^&*+=';
  let password = '';
  
  // Ensure we have at least one character from each category
  password += 'a'; // lowercase
  password += 'A'; // uppercase
  password += '1'; // number
  password += '$'; // special character
  
  // Fill the rest of the password
  for (let i = 4; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Function to get user input securely
function readSecureInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const listeners = stdin.listeners('data');
    
    // Remove existing listeners
    listeners.forEach((listener) => {
      stdin.removeListener('data', listener as any);
    });

    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    let password = '';

    // Handle user input
    const onData = (data: Buffer) => {
      const char = data.toString('utf8');
      
      // On Enter key
      if (char === '\r' || char === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        
        // Restore original listeners
        listeners.forEach((listener) => {
          stdin.on('data', listener as any);
        });
        
        process.stdout.write('\n');
        rl.close();
        resolve(password);
      } 
      // On backspace
      else if (char === '\b' || char === '\x7f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
      } 
      // On Ctrl+C
      else if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(0);
      } 
      // Add character to password
      else {
        password += char;
      }
    };

    stdin.on('data', onData);
  });
}

// Function to get user input with yes/no confirmation
function askQuestion(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Function to set up the database
async function setupDatabase(dbPassword: string): Promise<boolean> {
  console.log(`${YELLOW}Setting up database...${NC}`);
  
  // Check if PostgreSQL app is attached
  const postgresApps = runCommandWithOutput('flyctl postgres list');
  
  // Create PostgreSQL app if it doesn't exist
  if (!postgresApps.includes('twilight-sky-6674')) {
    console.log(`${YELLOW}PostgreSQL app not found. Creating a new PostgreSQL app...${NC}`);
    
    const createNew = await askQuestion('Do you want to create a new PostgreSQL database?');
    if (!createNew) {
      console.error(`${RED}Database setup aborted. Please create a PostgreSQL database manually.${NC}`);
      return false;
    }
    
    runCommand('flyctl postgres create --name twilight-sky-6674 --region ewr --vm-size shared-cpu-1x --volume-size 1', 
      'Failed to create PostgreSQL database. Please check the logs above.');
      
    console.log(`${YELLOW}Attaching PostgreSQL app to server app...${NC}`);
    runCommand('flyctl postgres attach twilight-sky-6674 -a lessons-marketplace-server', 
      'Failed to attach PostgreSQL database. Please check the logs above.');
  } else {
    // Skip attachment if database already exists
    console.log(`${GREEN}PostgreSQL app twilight-sky-6674 already exists.${NC}`);
    console.log(`${YELLOW}Checking if database is attached to server app...${NC}`);
    
    // Check if DATABASE_URL secret exists
    const secrets = runCommandWithOutput('flyctl secrets list -a lessons-marketplace-server');
    if (!secrets.includes('DATABASE_URL')) {
      console.log(`${YELLOW}Attaching PostgreSQL app to server app...${NC}`);
      runCommand('flyctl postgres attach twilight-sky-6674 -a lessons-marketplace-server', 
        'Failed to attach PostgreSQL database. Please check the logs above.');
    } else {
      console.log(`${GREEN}PostgreSQL app is already attached to server app.${NC}`);
      
      // Check if the user wants to recreate the DATABASE_URL secret
      const recreateSecret = await askQuestion('Do you want to recreate the DATABASE_URL secret? This is useful if the connection is no longer working.');
      if (recreateSecret) {
        console.log(`${YELLOW}Detaching and reattaching PostgreSQL app...${NC}`);
        try {
          // First unset the current DATABASE_URL secret
          runCommand('flyctl secrets unset DATABASE_URL -a lessons-marketplace-server',
            'Failed to unset DATABASE_URL secret. Please check the logs above.');
            
          // Then reattach the database
          runCommand('flyctl postgres attach twilight-sky-6674 -a lessons-marketplace-server', 
            'Failed to reattach PostgreSQL database. Please check the logs above.');
            
          console.log(`${GREEN}DATABASE_URL secret recreated successfully!${NC}`);
        } catch (error) {
          console.error(`${RED}Failed to recreate DATABASE_URL secret. Please check the logs above.${NC}`);
          return false;
        }
      }
    }
  }
  
  console.log(`${YELLOW}Creating database lessons_marketplace if it doesn't exist...${NC}`);
  try {
    // Use an interactive command to create the database
    console.log(`${YELLOW}Please run the following SQL command when prompted (you'll be connected to PostgreSQL):${NC}`);
    console.log(`${GREEN}CREATE DATABASE lessons_marketplace;${NC}`);
    console.log(`${YELLOW}If you see an error saying the database already exists, that's fine.${NC}`);
    console.log(`${YELLOW}Type '\\q' to exit when done.${NC}`);
    
    runCommand('flyctl postgres connect -a twilight-sky-6674', 
      'Failed to connect to PostgreSQL. Please check the logs above.');
    
    console.log(`${GREEN}Database setup completed successfully!${NC}`);
    return true;
  } catch (error) {
    console.error(`${RED}Failed to create database. Please check the logs above.${NC}`);
    return false;
  }
}

async function main() {
  console.log(`${YELLOW}Starting deployment process...${NC}`);

  // Check for command line arguments
  const args = process.argv.slice(2);
  const withDatabase = args.includes('--with-db');

  // Check if flyctl is installed
  if (!commandExists('flyctl')) {
    console.error(`${RED}Error: flyctl is not installed. Please install it first:${NC}`);
    console.log('curl -L https://fly.io/install.sh | sh');
    process.exit(1);
  }

  // Check if user is logged in to fly.io
  console.log(`${YELLOW}Checking fly.io authentication...${NC}`);
  try {
    execSync('flyctl auth whoami', { stdio: 'ignore' });
  } catch {
    console.error(`${RED}Error: You are not logged in to fly.io. Please login first:${NC}`);
    console.log('flyctl auth login');
    process.exit(1);
  }

  // Find configuration files
  const serverToml = fileExists('fly.server.toml') ? 'fly.server.toml' : 'server/fly.toml';
  const frontendToml = fileExists('fly.frontend.toml') ? 'fly.frontend.toml' : 'frontend/fly.toml';

  if (!fileExists(serverToml)) {
    console.error(`${RED}Error: Could not find server fly.toml configuration.${NC}`);
    process.exit(1);
  }

  if (!fileExists(frontendToml)) {
    console.error(`${RED}Error: Could not find frontend fly.toml configuration.${NC}`);
    process.exit(1);
  }

  console.log(`${GREEN}Found configuration files:${NC}`);
  console.log(`Server: ${serverToml}`);
  console.log(`Frontend: ${frontendToml}`);
  
  if (withDatabase) {
    console.log(`${YELLOW}Database setup enabled with --with-db flag${NC}`);
    
    // Ask user if they want to use a generated password or provide their own
    const useGeneratedPassword = await askQuestion('Do you want to use a generated secure password?');
    
    let dbPassword: string;
    if (useGeneratedPassword) {
      dbPassword = generateSecurePassword();
      console.log(`${GREEN}Generated secure password: ${dbPassword}${NC}`);
      console.log(`${YELLOW}IMPORTANT: Save this password in a secure location. It won't be shown again.${NC}`);
      const confirmed = await askQuestion('Have you saved the password?');
      if (!confirmed) {
        console.error(`${RED}Deployment aborted. Please save the password and try again.${NC}`);
        process.exit(1);
      }
    } else {
      console.log(`${YELLOW}Please enter your database password.${NC}`);
      dbPassword = await readSecureInput('Enter your database password: ');
    }
    
    // Set up the database
    const dbSetupSuccess = await setupDatabase(dbPassword);
    if (!dbSetupSuccess) {
      console.log(`${YELLOW}Continuing with deployment...${NC}`);
    }

    // Set database password as a secret
    console.log(`${YELLOW}Setting database password as a secret...${NC}`);
    try {
      // Write the password to a temporary file to avoid shell escaping issues
      const tempFile = path.join(os.tmpdir(), 'db-password-temp');
      fs.writeFileSync(tempFile, dbPassword);
      
      // Use the file to set the secret instead of passing the password directly
      execSync(`flyctl secrets set DB_PASSWORD=@${tempFile} -a lessons-marketplace-server`, 
        { stdio: 'inherit' });
      
      // Delete the temporary file
      fs.unlinkSync(tempFile);
      
      console.log(`${GREEN}Database password set successfully!${NC}`);
    } catch (error) {
      console.error(`${RED}Failed to set database password secret. Please check the logs above.${NC}`);
      process.exit(1);
    }
  } else {
    console.log(`${YELLOW}Skipping database setup (use --with-db flag to enable)${NC}`);
  }

  // Deploy API
  console.log(`${YELLOW}Deploying API to fly.io...${NC}`);
  runCommand(`flyctl deploy --config ${serverToml} --remote-only`, 'API deployment failed. Please check the logs above.');
  console.log(`${GREEN}API deployed successfully!${NC}`);

  // Deploy Frontend
  console.log(`${YELLOW}Deploying Frontend to fly.io...${NC}`);
  runCommand(`flyctl deploy --config ${frontendToml} --remote-only`, 'Frontend deployment failed. Please check the logs above.');
  console.log(`${GREEN}Frontend deployed successfully!${NC}`);

  console.log(`${GREEN}Deployment completed successfully!${NC}`);
  console.log(`API URL: https://lessons-marketplace-server.fly.dev`);
  console.log(`Frontend URL: https://lessons-marketplace-frontend.fly.dev`);
  console.log(`${YELLOW}Note: It may take a few minutes for the changes to propagate.${NC}`);
}

main().catch(error => {
  console.error(`${RED}An unexpected error occurred:${NC}`, error);
  process.exit(1);
});