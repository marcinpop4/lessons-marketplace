import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

const profileName = process.env.profile || 'ci';

async function debugDockerContainers() {
  try {
    console.log(`=== DEBUG INFO FOR PROFILE: ${profileName} ===`);
    
    // Check all running containers
    const { stdout: containers } = await execAsync('docker ps -a');
    console.log('=== ALL CONTAINERS ===');
    console.log(containers);
    
    // Get server container logs
    const { stdout: containerId } = await execAsync(
      `docker ps -aq --filter name=lessons-marketplace-server`
    );
    
    if (containerId.trim()) {
      console.log('=== SERVER CONTAINER LOGS ===');
      try {
        const { stdout: logs } = await execAsync(`docker logs ${containerId.trim()}`);
        console.log(logs);
        
        // Save logs to file
        await fs.writeFile('server-container-debug.log', logs);
        console.log('Logs saved to server-container-debug.log');
        
        // Get container environment variables
        console.log('=== SERVER CONTAINER ENV VARS ===');
        try {
          const { stdout: envVars } = await execAsync(`docker exec ${containerId.trim()} env`);
          console.log(envVars);
        } catch (envError) {
          console.error('Could not get environment variables:', envError);
        }

        // Check database connection
        console.log('=== DATABASE CONNECTION TEST ===');
        try {
          const { stdout: dbTest } = await execAsync(
            `docker exec ${containerId.trim()} curl -v database-${profileName}:5432`
          );
          console.log(dbTest);
        } catch (dbError) {
          console.error('Could not test database connection:', dbError);
          
          // Try alternative connection test using nc if available
          try {
            console.log('Attempting alternative database connection test...');
            const { stdout: altDbTest } = await execAsync(
              `docker exec ${containerId.trim()} sh -c "nc -z -v database-${profileName} 5432 || echo 'Connection failed'"`
            );
            console.log(altDbTest);
          } catch (altDbError) {
            console.error('Alternative database connection test failed:', altDbError);
            
            // Try ping as last resort
            try {
              const { stdout: pingTest } = await execAsync(
                `docker exec ${containerId.trim()} ping -c 3 database-${profileName}`
              );
              console.log(pingTest);
            } catch (pingError) {
              console.error('Ping test failed:', pingError);
            }
          }
        }
        
        // Create and copy a simple debug script
        console.log('=== CREATING SIMPLE DEBUG SCRIPT ===');
        const simpleDebugScript = `
// Simple debug script that works without tsx
const fs = require('fs');
const net = require('net');
const { execSync } = require('child_process');

console.log('=== NODE.JS ENVIRONMENT ===');
console.log(\`Node version: \${process.version}\`);
console.log(\`Working directory: \${process.cwd()}\`);

console.log('\\n=== ENVIRONMENT VARIABLES ===');
Object.keys(process.env)
  .sort()
  .forEach(key => {
    if (/password|secret|key|token/i.test(key)) {
      console.log(\`\${key}=*******\`);
    } else {
      console.log(\`\${key}=\${process.env[key]}\`);
    }
  });

console.log('\\n=== FILE SYSTEM ===');
try {
  console.log('Current directory contents:');
  console.log(fs.readdirSync('.'));
  
  if (fs.existsSync('./server/prisma')) {
    console.log('\\nPrisma directory contents:');
    console.log(fs.readdirSync('./server/prisma'));
  }
} catch (error) {
  console.error('File system check error:', error);
}

console.log('\\n=== DATABASE CONNECTION TEST ===');
const dbHost = process.env.DB_HOST || \`database-\${process.env.profile || 'ci'}\`;
const dbPort = process.env.DB_PORT || 5432;

console.log(\`Testing connection to \${dbHost}:\${dbPort}\`);

const client = new net.Socket();
let connected = false;

client.connect(dbPort, dbHost, () => {
  console.log(\`Successfully connected to \${dbHost}:\${dbPort}\`);
  connected = true;
  client.end();
});

client.on('error', (err) => {
  console.error(\`Connection error: \${err.message}\`);
});

setTimeout(() => {
  if (!connected) {
    console.log('Connection timed out after 5 seconds');
    
    try {
      console.log('\\nAttempting to ping the database:');
      const pingResult = execSync(\`ping -c 3 \${dbHost}\`).toString();
      console.log(pingResult);
    } catch (pingError) {
      console.error('Ping failed:', pingError.message);
    }
  }
}, 5000);
`;

        await fs.writeFile('simple-debug.js', simpleDebugScript);
        await execAsync(`docker cp simple-debug.js ${containerId.trim()}:/app/`);
        
        // Run Prisma Debug Script
        console.log('=== RUNNING PRISMA DEBUG SCRIPT ===');
        try {
          await execAsync(`docker cp server/prisma.debug.ts ${containerId.trim()}:/app/server/`);
          
          // Check if tsx is available
          try {
            const { stdout: tsxVersion } = await execAsync(
              `docker exec ${containerId.trim()} which tsx`
            );
            console.log(`tsx found at: ${tsxVersion}`);
            
            const { stdout: prismaDebug } = await execAsync(
              `docker exec ${containerId.trim()} tsx server/prisma.debug.ts`
            );
            console.log(prismaDebug);
          } catch (tsxError) {
            console.log('tsx not found, trying alternative methods');
            
            // Try with ts-node
            try {
              const { stdout: tsNodeOutput } = await execAsync(
                `docker exec ${containerId.trim()} npx ts-node server/prisma.debug.ts`
              );
              console.log(tsNodeOutput);
            } catch (tsNodeError) {
              console.error('ts-node execution failed:', tsNodeError);
              
              // Run the simple debug script instead
              try {
                console.log('Running simple Node.js debug script:');
                const { stdout: simpleDebug } = await execAsync(
                  `docker exec ${containerId.trim()} node /app/simple-debug.js`
                );
                console.log(simpleDebug);
              } catch (simpleDebugError) {
                console.error('Simple debug script failed:', simpleDebugError);
              }
            }
          }
        } catch (prismaError) {
          console.error('Could not run Prisma debug script:', prismaError);
        }
        
        // Run Database Connection Test Script
        console.log('=== RUNNING DATABASE CONNECTION TEST SCRIPT ===');
        try {
          await execAsync(`docker cp scripts/db-connection-test.ts ${containerId.trim()}:/app/scripts/`);
          
          // Try with tsx first
          try {
            const { stdout: dbConnectionTest } = await execAsync(
              `docker exec ${containerId.trim()} tsx scripts/db-connection-test.ts`
            );
            console.log(dbConnectionTest);
          } catch (tsxDbError) {
            console.log('tsx not found for DB test, trying alternatives');
            
            // Try with ts-node
            try {
              const { stdout: tsNodeDbOutput } = await execAsync(
                `docker exec ${containerId.trim()} npx ts-node scripts/db-connection-test.ts`
              );
              console.log(tsNodeDbOutput);
            } catch (tsNodeDbError) {
              console.error('ts-node DB test failed:', tsNodeDbError);
              
              // Simple connection test as fallback
              try {
                console.log('Running direct DB connection test:');
                const { stdout: directDbTest } = await execAsync(`
                  docker exec ${containerId.trim()} sh -c "
                    echo 'Testing database connection...'
                    echo 'DB_HOST: \$DB_HOST'
                    echo 'DB_PORT: \$DB_PORT'
                    nc -z -v \${DB_HOST:-database-${profileName}} \${DB_PORT:-5432} || echo 'Connection test failed'
                  "
                `);
                console.log(directDbTest);
              } catch (directDbError) {
                console.error('Direct DB test failed:', directDbError);
              }
            }
          }
        } catch (dbConnError) {
          console.error('Could not run DB connection test script:', dbConnError);
        }
      } catch (logsError) {
        console.error('Could not get container logs:', logsError);
      }
    } else {
      console.log('Server container not found');
    }
    
    // Check database logs
    const { stdout: dbContainerId } = await execAsync(
      `docker ps -aq --filter name=lessons-marketplace-db`
    );
    
    if (dbContainerId.trim()) {
      console.log('=== DATABASE CONTAINER LOGS ===');
      try {
        const { stdout: dbLogs } = await execAsync(`docker logs ${dbContainerId.trim()}`);
        console.log(dbLogs);
        
        // Save DB logs to file
        await fs.writeFile('db-container-debug.log', dbLogs);
        console.log('DB logs saved to db-container-debug.log');
        
        // Check database container status
        console.log('=== DATABASE CONTAINER STATUS ===');
        try {
          const { stdout: dbInfo } = await execAsync(`docker inspect ${dbContainerId.trim()}`);
          const dbInfoObj = JSON.parse(dbInfo);
          console.log('Container State:', dbInfoObj[0]?.State);
          console.log('Health Status:', dbInfoObj[0]?.State?.Health?.Status);
        } catch (dbStatusError) {
          console.error('Could not get database container status:', dbStatusError);
        }
      } catch (dbLogsError) {
        console.error('Could not get database logs:', dbLogsError);
      }
    }
    
    // Check Docker network
    console.log('=== DOCKER NETWORK INFO ===');
    const { stdout: networkInfo } = await execAsync('docker network ls');
    console.log(networkInfo);
    
    try {
      const { stdout: inspectNetwork } = await execAsync('docker network inspect docker_default');
      console.log(inspectNetwork);
    } catch (networkError) {
      console.error('Could not inspect network:', networkError);
    }
    
    // Summarize findings
    console.log('\n=== SUMMARY ===');
    if (!containerId.trim()) {
      console.log('❌ Server container is not running - this is the main issue.');
    } else if (!dbContainerId.trim()) {
      console.log('❌ Database container is not running - server depends on it.');
    } else {
      console.log('Both server and database containers are present.');
      console.log('Check the logs for specific errors on why the server is failing.');
    }
    
    // Clean up temporary files
    try {
      await fs.unlink('simple-debug.js');
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugDockerContainers(); 