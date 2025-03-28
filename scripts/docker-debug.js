// Docker Debug Script (pure JavaScript version)
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { mkdirSync, existsSync } from 'fs';

const execAsync = promisify(exec);

const profileName = process.env.profile || 'ci';

// Define docker compose command (without hyphen for GitHub Actions)
const DOCKER_COMPOSE_CMD = 'docker compose';

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
        
        // Save logs to the logs directory
        await fs.writeFile('logs/server-container-debug.log', logs);
        console.log('Logs saved to logs/server-container-debug.log');
        
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
        
        // Copy container-debug.js to the container
        console.log('=== COPYING CONTAINER DEBUG SCRIPT ===');
        try {
          await copyContainerDebugScript(containerId.trim());
        } catch (copyError) {
          console.error('Failed to copy container debug script:', copyError);
        }
        
        // Run container-debug.js in the container
        console.log('=== RUNNING CONTAINER DEBUG SCRIPT ===');
        try {
          await runContainerDebugScript(containerId.trim());
        } catch (debugError) {
          console.error('Failed to run container debug script:', debugError);
        }
        
        // Check for OpenSSL in the container
        console.log('=== CHECKING OPENSSL IN CONTAINER ===');
        try {
          const { stdout: opensslVersion } = await execAsync(
            `docker exec ${containerId.trim()} openssl version`
          );
          console.log(`OpenSSL version: ${opensslVersion}`);
        } catch (opensslError) {
          console.error('OpenSSL check failed, trying to find openssl binary:', opensslError);
          try {
            const { stdout: findOpenssl } = await execAsync(
              `docker exec ${containerId.trim()} which openssl || echo "Not found"`
            );
            console.log(`OpenSSL binary: ${findOpenssl}`);
            
            // Check installed packages
            try {
              const { stdout: packages } = await execAsync(
                `docker exec ${containerId.trim()} sh -c "apt list --installed 2>/dev/null | grep -E 'openssl|libssl' || echo 'Package info not available'"`
              );
              console.log('OpenSSL related packages:');
              console.log(packages);
            } catch (pkgError) {
              console.error('Failed to check installed packages:', pkgError);
            }
          } catch (findError) {
            console.error('Failed to find OpenSSL binary:', findError);
          }
        }
        
        // Check Node.js modules in the container
        console.log('=== CHECKING NODE MODULES IN CONTAINER ===');
        try {
          const { stdout: nodeModules } = await execAsync(
            `docker exec ${containerId.trim()} sh -c "find /app/node_modules -name prisma -type d || echo 'Prisma not found'"`
          );
          console.log('Prisma modules:');
          console.log(nodeModules);
          
          if (nodeModules.includes('prisma')) {
            try {
              const { stdout: prismaVersion } = await execAsync(
                `docker exec ${containerId.trim()} sh -c "cat /app/node_modules/prisma/package.json | grep version || echo 'Version not found'"`
              );
              console.log('Prisma version:', prismaVersion);
            } catch (versionError) {
              console.error('Failed to check Prisma version:', versionError);
            }
          }
        } catch (modulesError) {
          console.error('Failed to check Node.js modules:', modulesError);
        }
        
        // Direct network tests
        console.log('=== DIRECT NETWORK TESTS ===');
        try {
          // Show all network interfaces
          const { stdout: interfaces } = await execAsync(
            `docker exec ${containerId.trim()} sh -c "ip addr show || ifconfig"`
          );
          console.log('Network interfaces:');
          console.log(interfaces);
          
          // Check DNS resolution
          const { stdout: dnsTest } = await execAsync(
            `docker exec ${containerId.trim()} sh -c "getent hosts database-${profileName} || echo 'DNS resolution failed'"`
          );
          console.log('DNS resolution for database:');
          console.log(dnsTest);
        } catch (networkError) {
          console.error('Network tests failed:', networkError);
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
        
        // Save logs to the logs directory
        await fs.writeFile('logs/db-container-debug.log', dbLogs);
        console.log('DB logs saved to logs/db-container-debug.log');
        
        // Check database container status
        console.log('=== DATABASE CONTAINER STATUS ===');
        try {
          const { stdout: dbInfo } = await execAsync(`docker inspect ${dbContainerId.trim()}`);
          const dbInfoObj = JSON.parse(dbInfo);
          console.log('Container State:', dbInfoObj[0]?.State);
          console.log('Health Status:', dbInfoObj[0]?.State?.Health?.Status);
          
          // Check volume mounts
          console.log('\nVolume Mounts:');
          const mounts = dbInfoObj[0]?.Mounts || [];
          mounts.forEach(mount => {
            console.log(`- ${mount.Source} -> ${mount.Destination} (${mount.Type})`);
          });
        } catch (dbStatusError) {
          console.error('Could not get database container status:', dbStatusError);
        }
        
        // Check database internal state
        console.log('=== DATABASE INTERNAL STATE ===');
        try {
          // Test if PostgreSQL is accepting connections
          const { stdout: pgTest } = await execAsync(
            `docker exec ${dbContainerId.trim()} pg_isready || echo "PostgreSQL is not ready"`
          );
          console.log('PostgreSQL readiness:', pgTest);
        } catch (pgError) {
          console.error('Could not check PostgreSQL readiness:', pgError);
        }
      } catch (dbLogsError) {
        console.error('Could not get database logs:', dbLogsError);
      }
    } else {
      console.log('Database container not found');
    }
    
    // Check Docker network
    console.log('=== DOCKER NETWORK INFO ===');
    const { stdout: networkInfo } = await execAsync('docker network ls');
    console.log(networkInfo);
    
    try {
      const { stdout: inspectNetwork } = await execAsync('docker network inspect docker_default');
      console.log(inspectNetwork);
      
      // Parse network info
      const networkData = JSON.parse(inspectNetwork);
      if (networkData && networkData.length > 0) {
        console.log('\nNetwork Containers:');
        const containers = networkData[0].Containers || {};
        Object.keys(containers).forEach(id => {
          const container = containers[id];
          console.log(`- ${container.Name}: ${container.IPv4Address} (${id.substring(0, 12)})`);
        });
      }
    } catch (networkError) {
      console.error('Could not inspect network:', networkError);
    }
    
    // Check Docker volumes
    console.log('=== DOCKER VOLUMES ===');
    try {
      const { stdout: volumes } = await execAsync('docker volume ls');
      console.log(volumes);
    } catch (volumeError) {
      console.error('Could not list Docker volumes:', volumeError);
    }
    
    // Check Docker Compose file
    console.log('=== DOCKER COMPOSE CONFIG ===');
    try {
      const { stdout: composeConfig } = await execAsync(`${DOCKER_COMPOSE_CMD} -f docker/docker-compose.yml --profile ${profileName} config`);
      console.log(composeConfig);
    } catch (composeError) {
      console.error('Could not display Docker Compose config:', composeError);
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
    
    // Create a debug report
    await createDebugReport();
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

// Helper to check if file exists
async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function copyContainerDebugScript(serverId) {
  try {
    console.log('=== COPYING CONTAINER DEBUG SCRIPT ===');
    
    // Use container-debug.mjs instead of .js to support ES modules
    await execAsync(`docker cp scripts/container-debug.mjs ${serverId}:/app/container-debug.mjs`);
    
    console.log('Container debug script copied successfully');
    return true;
  } catch (error) {
    console.error(`Failed to copy container debug script: ${error.message}`);
    return false;
  }
}

async function runContainerDebugScript(serverId) {
  try {
    console.log('=== RUNNING CONTAINER DEBUG SCRIPT ===');
    
    // Use .mjs extension when executing the script
    const { stdout, stderr } = await execAsync(`docker exec ${serverId} node /app/container-debug.mjs`);
    
    // Save logs to the logs directory
    await fs.writeFile('logs/container-debug.log', stdout + '\n' + stderr);
    console.log('Logs saved to logs/container-debug.log');
    return true;
  } catch (error) {
    console.error(`Failed to run container debug script: ${error}`);
    return false;
  }
}

async function createDebugReport() {
  console.log('\n=== CREATING DEBUG REPORT ===');
  try {
    // Create directories in logs folder
    try {
      mkdirSync('logs', { recursive: true });
      const debugReportDir = 'logs/docker-debug-report';
      mkdirSync(debugReportDir, { recursive: true });
      
      // Copy log files to the debug report directory
      if (existsSync('logs/container-debug.log')) {
        await fs.copyFile('logs/container-debug.log', `${debugReportDir}/container-debug.log`);
        console.log('Container debug log copied to debug report');
      }
      
      if (existsSync('logs/server-container-debug.log')) {
        await fs.copyFile('logs/server-container-debug.log', `${debugReportDir}/server-container-debug.log`);
        console.log('Server container debug log copied to debug report');
      }
      
      if (existsSync('logs/db-container-debug.log')) {
        await fs.copyFile('logs/db-container-debug.log', `${debugReportDir}/db-container-debug.log`);
        console.log('Database container debug log copied to debug report');
      }
      
      // Add timestamp file
      await fs.writeFile(`${debugReportDir}/timestamp.txt`, new Date().toString());
      
      console.log(`Debug report created in ${debugReportDir}/`);
      return true;
    } catch (fsError) {
      console.error(`Failed to create debug report directories: ${fsError.message}`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to create debug report: ${error.message}`);
    return false;
  }
}

// Run the debug function
debugDockerContainers().catch(error => {
  console.error('Uncaught error in debug script:', error);
  process.exit(1);
}); 