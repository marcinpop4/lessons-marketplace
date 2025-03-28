// Docker Debug Script (pure JavaScript version)
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { mkdirSync, existsSync } from 'fs';

const execAsync = promisify(exec);

const profileName = process.env.profile || 'ci';

// Define docker compose command (without hyphen for GitHub Actions)
const DOCKER_COMPOSE_CMD = 'docker compose';

// Ensure logs directory exists before writing to it
async function ensureLogsDirectoryExists() {
  try {
    // Try to create logs directory if it doesn't exist
    if (!existsSync('logs')) {
      try {
        mkdirSync('logs', { recursive: true });
      } catch (mkdirError) {
        console.error('Warning: Could not create logs directory:', mkdirError.message);
      }
    }
  } catch (error) {
    console.error('Error creating logs directory:', error);
    console.log('Will try to continue with debug process anyway');
  }
}

async function writeLogFile(filename, content) {
  try {
    await ensureLogsDirectoryExists();
    
    try {
      await fs.writeFile(filename, content);
      console.log(`Logs saved to ${filename}`);
    } catch (error) {
      console.error(`Error writing to ${filename}:`, error);
    }
  } catch (error) {
    console.error(`Error preparing to write logs:`, error);
  }
}

async function debugDockerContainers() {
  // Ensure logs directory exists
  await ensureLogsDirectoryExists();
  
  try {
    console.log(`=== DEBUG INFO FOR PROFILE: ${profileName} ===`);
    
    // Check all running containers
    const { stdout: containers } = await execAsync('docker ps -a');
    console.log('=== ALL CONTAINERS ===');
    console.log(containers);
    
    // Get server container logs - now with profile-specific naming
    const { stdout: serverContainerId } = await execAsync(
      `docker ps -aq --filter "name=lessons-marketplace-server-${profileName}"`
    );
    
    if (serverContainerId.trim()) {
      console.log('=== SERVER CONTAINER LOGS ===');
      try {
        const { stdout: logs } = await execAsync(`docker logs ${serverContainerId.trim()}`);
        console.log(logs);
        
        // Save logs to the logs directory
        await writeLogFile('logs/server-container-debug.log', logs);
        
        // Get container environment variables
        console.log('=== SERVER CONTAINER ENV VARS ===');
        try {
          const { stdout: envVars } = await execAsync(`docker exec ${serverContainerId.trim()} env`);
          console.log(envVars);
        } catch (envError) {
          console.error('Could not get environment variables:', envError);
        }

        // Check database connection
        console.log('=== DATABASE CONNECTION TEST ===');
        try {
          const { stdout: dbTest } = await execAsync(
            `docker exec ${serverContainerId.trim()} curl -v database-${profileName}:5432`
          );
          console.log(dbTest);
        } catch (dbError) {
          console.error('Could not test database connection:', dbError);
          
          // Try alternative connection test using nc if available
          try {
            console.log('Attempting alternative database connection test...');
            const { stdout: altDbTest } = await execAsync(
              `docker exec ${serverContainerId.trim()} sh -c "nc -z -v database-${profileName} 5432 || echo 'Connection failed'"`
            );
            console.log(altDbTest);
          } catch (altDbError) {
            console.error('Alternative database connection test failed:', altDbError);
            
            // Try ping as last resort
            try {
              const { stdout: pingTest } = await execAsync(
                `docker exec ${serverContainerId.trim()} ping -c 3 database-${profileName}`
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
          await copyContainerDebugScript(serverContainerId.trim());
        } catch (copyError) {
          console.error('Failed to copy container debug script:', copyError);
        }
        
        // Run container-debug.js in the container
        console.log('=== RUNNING CONTAINER DEBUG SCRIPT ===');
        try {
          await runContainerDebugScript(serverContainerId.trim());
        } catch (debugError) {
          console.error('Failed to run container debug script:', debugError);
        }
        
        // Check for OpenSSL in the container
        console.log('=== CHECKING OPENSSL IN CONTAINER ===');
        try {
          const { stdout: opensslVersion } = await execAsync(
            `docker exec ${serverContainerId.trim()} openssl version`
          );
          console.log(`OpenSSL version: ${opensslVersion}`);
        } catch (opensslError) {
          console.error('OpenSSL check failed, trying to find openssl binary:', opensslError);
          try {
            const { stdout: findOpenssl } = await execAsync(
              `docker exec ${serverContainerId.trim()} which openssl || echo "Not found"`
            );
            console.log(`OpenSSL binary: ${findOpenssl}`);
            
            // Check installed packages
            try {
              const { stdout: packages } = await execAsync(
                `docker exec ${serverContainerId.trim()} sh -c "apt list --installed 2>/dev/null | grep -E 'openssl|libssl' || echo 'Package info not available'"`
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
            `docker exec ${serverContainerId.trim()} sh -c "find /app/node_modules -name prisma -type d || echo 'Prisma not found'"`
          );
          console.log('Prisma modules:');
          console.log(nodeModules);
          
          if (nodeModules.includes('prisma')) {
            try {
              const { stdout: prismaVersion } = await execAsync(
                `docker exec ${serverContainerId.trim()} sh -c "cat /app/node_modules/prisma/package.json | grep version || echo 'Version not found'"`
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
            `docker exec ${serverContainerId.trim()} sh -c "ip addr show || ifconfig"`
          );
          console.log('Network interfaces:');
          console.log(interfaces);
          
          // Check DNS resolution
          const { stdout: dnsTest } = await execAsync(
            `docker exec ${serverContainerId.trim()} sh -c "getent hosts database-${profileName} || echo 'DNS resolution failed'"`
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
      // Fallback to old naming scheme
      const { stdout: oldServerContainerId } = await execAsync(
        `docker ps -aq --filter "name=lessons-marketplace-server"`
      );
      
      if (oldServerContainerId.trim()) {
        console.log('=== SERVER CONTAINER LOGS (old naming) ===');
        try {
          const { stdout: logs } = await execAsync(`docker logs ${oldServerContainerId.trim()}`);
          console.log(logs);
          
          // Save logs to the logs directory
          await writeLogFile('logs/server-container-debug.log', logs);
        } catch (error) {
          console.log('Could not get container logs:', error);
        }
      }
    }
    
    // Get database container logs - with profile-specific naming
    const { stdout: dbContainerId } = await execAsync(
      `docker ps -aq --filter "name=lessons-marketplace-db-${profileName}"`
    );
    
    if (dbContainerId.trim()) {
      console.log('=== DATABASE CONTAINER LOGS ===');
      try {
        const { stdout: logs } = await execAsync(`docker logs ${dbContainerId.trim()}`);
        console.log(logs);
        
        // Save logs to the logs directory
        await writeLogFile('logs/db-container-debug.log', logs);
        
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
      // Fallback to old naming scheme
      const { stdout: oldDbContainerId } = await execAsync(
        `docker ps -aq --filter "name=lessons-marketplace-db"`
      );
      
      if (oldDbContainerId.trim()) {
        console.log('=== DATABASE CONTAINER LOGS (old naming) ===');
        try {
          const { stdout: logs } = await execAsync(`docker logs ${oldDbContainerId.trim()}`);
          console.log(logs);
          
          // Save logs to the logs directory
          await writeLogFile('logs/db-container-debug.log', logs);
        } catch (error) {
          console.log('Could not get database logs:', error);
        }
      }
    }
    
    // Get Docker network information
    try {
      const { stdout: networkList } = await execAsync('docker network ls');
      console.log('=== DOCKER NETWORK INFO ===');
      console.log(networkList);
      
      // Get detailed network info for the docker_default network
      try {
        const { stdout: networkInspect } = await execAsync('docker network inspect docker_default');
        console.log(networkInspect);
        
        // Parse the network inspection output to extract container details
        const networkInfo = JSON.parse(networkInspect);
        const containers = networkInfo[0]?.Containers || {};
        
        console.log('\nNetwork Containers:');
        Object.entries(containers).forEach(([id, info]) => {
          console.log(`- ${info.Name}: ${info.IPv4Address} (${id.substring(0, 12)})`);
        });
      } catch (error) {
        console.log('Could not display network details:', error.message);
      }
    } catch (error) {
      console.log('Could not get network information:', error.message);
    }
    
    // Display volumes information
    try {
      const { stdout: volumes } = await execAsync('docker volume ls');
      console.log('=== DOCKER VOLUMES ===');
      console.log(volumes);
    } catch (error) {
      console.log('Could not get volumes information:', error.message);
    }
    
    // Display Docker Compose configuration
    try {
      const { stdout: composeConfig } = await execAsync(
        `${DOCKER_COMPOSE_CMD} -f docker/docker-compose.yml --profile ${profileName} config`
      );
      console.log('=== DOCKER COMPOSE CONFIG ===');
      console.log(composeConfig);
    } catch (error) {
      console.log('Could not display Docker Compose config:', error);
    }
  } catch (error) {
    console.error('Error debugging Docker containers:', error);
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
    await writeLogFile('logs/container-debug.log', stdout + '\n' + stderr);
    return true;
  } catch (error) {
    console.error(`Failed to run container debug script: ${error}`);
    return false;
  }
}

async function createDebugReport() {
  try {
    const timestamp = new Date()
      .toISOString()
      .replace(/:/g, '')
      .replace(/\..+/, '')
      .replace('T', '_');
    
    const reportDir = `logs/docker-debug-report`;
    
    // Try to create the directory with proper permissions
    try {
      await execAsync(`sudo mkdir -p ${reportDir} 2>/dev/null`);
      await execAsync(`sudo chmod -R 777 ${reportDir} 2>/dev/null`);
    } catch (error) {
      // Fall back to regular mkdir
      try {
        mkdirSync(reportDir, { recursive: true });
      } catch (mkdirError) {
        console.error('Failed to create debug report directories:', mkdirError.message);
        return false;
      }
    }
    
    // Copy log files to the report directory
    let foundLogs = false;
    
    // Check for log files in the logs directory
    const logFiles = ['container-debug.log', 'server-container-debug.log', 'db-container-debug.log'];
    
    for (const logFile of logFiles) {
      try {
        if (existsSync(`logs/${logFile}`)) {
          await execAsync(`sudo cp logs/${logFile} ${reportDir}/ 2>/dev/null || cp logs/${logFile} ${reportDir}/`);
          foundLogs = true;
        }
      } catch (error) {
        console.error(`Failed to copy ${logFile}:`, error.message);
      }
    }
    
    // Save Docker state
    try {
      const { stdout: dockerInfo } = await execAsync('docker info');
      await writeLogFile(`${reportDir}/docker-info.txt`, dockerInfo);
      foundLogs = true;
    } catch (error) {
      console.error('Failed to get Docker info:', error.message);
    }
    
    // Save Docker network info
    try {
      const { stdout: networkInfo } = await execAsync('docker network ls');
      await writeLogFile(`${reportDir}/docker-networks.txt`, networkInfo);
      foundLogs = true;
    } catch (error) {
      console.error('Failed to get Docker network info:', error.message);
    }
    
    // Save Docker volumes info
    try {
      const { stdout: volumeInfo } = await execAsync('docker volume ls');
      await writeLogFile(`${reportDir}/docker-volumes.txt`, volumeInfo);
      foundLogs = true;
    } catch (error) {
      console.error('Failed to get Docker volume info:', error.message);
    }
    
    // Add timestamp file
    try {
      await writeLogFile(`${reportDir}/timestamp.txt`, `Debug report created at: ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Failed to write timestamp file:', error.message);
    }
    
    if (foundLogs) {
      console.log(`Debug report created in ${reportDir}`);
      return true;
    } else {
      console.log('No logs found to create debug report');
      return false;
    }
  } catch (error) {
    console.error('Failed to create debug report:', error.message);
    return false;
  }
}

// Run the debug function
debugDockerContainers().catch(error => {
  console.error('Uncaught error in debug script:', error);
  process.exit(1);
}); 