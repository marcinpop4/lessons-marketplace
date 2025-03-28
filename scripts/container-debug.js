// Simple debug script that works with ES modules
import fs from 'fs';
import net from 'net';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';

/**
 * Container Debug Script
 * 
 * This script runs in the container environment and tests various aspects
 * of the environment to help debug server startup issues.
 * 
 * It does not require tsx or ts-node, only Node.js.
 */

console.log('=== CONTAINER DEBUG SCRIPT ===');
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log(`Node version: ${process.version}`);
console.log(`Operating system: ${os.type()} ${os.release()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`Hostname: ${os.hostname()}`);
console.log(`CPU cores: ${os.cpus().length}`);
console.log(`Total memory: ${Math.round(os.totalmem() / (1024 * 1024))} MB`);
console.log(`Free memory: ${Math.round(os.freemem() / (1024 * 1024))} MB`);
console.log(`Working directory: ${process.cwd()}`);

// Check environment variables
console.log('\n=== ENVIRONMENT VARIABLES ===');
const envVars = Object.keys(process.env).sort();
for (const key of envVars) {
  // Mask sensitive information
  if (/password|secret|key|token/i.test(key)) {
    console.log(`${key}=*******`);
  } else {
    console.log(`${key}=${process.env[key]}`);
  }
}

// Check for critical environment variables
console.log('\n=== CRITICAL ENVIRONMENT VARIABLES ===');
const criticalVars = [
  'DATABASE_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 
  'DB_HOST', 'DB_PORT', 'NODE_ENV', 'profile'
];

for (const varName of criticalVars) {
  if (process.env[varName]) {
    if (/password/i.test(varName)) {
      console.log(`✅ ${varName} is set (value hidden)`);
    } else {
      console.log(`✅ ${varName} = ${process.env[varName]}`);
    }
  } else {
    console.log(`❌ ${varName} is NOT set`);
  }
}

// Check file system
console.log('\n=== FILE SYSTEM ===');
try {
  console.log('Current directory contents:');
  const files = fs.readdirSync('.');
  files.forEach(file => {
    try {
      const stats = fs.statSync(path.join('.', file));
      const isDir = stats.isDirectory() ? '/' : '';
      console.log(`- ${file}${isDir}`);
    } catch (err) {
      console.log(`- ${file} (error: ${err.message})`);
    }
  });
  
  // Check for critical directories and files
  const criticalPaths = [
    './server', './server/prisma', './server/index.ts', './server/prisma/schema.prisma', 
    './dist', './node_modules'
  ];
  
  console.log('\nChecking critical paths:');
  for (const critPath of criticalPaths) {
    try {
      const exists = fs.existsSync(critPath);
      if (exists) {
        const stats = fs.statSync(critPath);
        if (stats.isDirectory()) {
          console.log(`✅ ${critPath} exists (directory)`);
          // List contents of important directories
          if (critPath === './server/prisma') {
            console.log(`Contents of ${critPath}:`);
            fs.readdirSync(critPath).forEach(item => console.log(`  - ${item}`));
          }
        } else {
          console.log(`✅ ${critPath} exists (file, ${stats.size} bytes)`);
          // Show content of schema.prisma
          if (critPath === './server/prisma/schema.prisma') {
            console.log('\nPrisma schema file:');
            const schemaContent = fs.readFileSync(critPath, 'utf8');
            console.log(schemaContent.substring(0, 500) + (schemaContent.length > 500 ? '...' : ''));
          }
        }
      } else {
        console.log(`❌ ${critPath} does NOT exist`);
      }
    } catch (err) {
      console.log(`❌ Error checking ${critPath}: ${err.message}`);
    }
  }
} catch (error) {
  console.error('File system check error:', error);
}

// Database connection test
console.log('\n=== DATABASE CONNECTION TEST ===');
const dbHost = process.env.DB_HOST || `database-${process.env.profile || 'ci'}`;
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

console.log(`Testing connection to ${dbHost}:${dbPort}`);

const client = new net.Socket();
let connected = false;

client.connect(dbPort, dbHost, () => {
  console.log(`✅ Successfully connected to ${dbHost}:${dbPort}`);
  connected = true;
  client.end();
});

client.on('error', (err) => {
  console.error(`❌ Connection error: ${err.message}`);
});

// Allow some time for the connection test to complete
setTimeout(() => {
  if (!connected) {
    console.log('❌ Connection timed out after 3 seconds');
    
    // Try ping
    console.log('\nAttempting to ping the database host:');
    try {
      const pingResult = execSync(`ping -c 3 ${dbHost}`, { timeout: 5000 }).toString();
      console.log(pingResult);
    } catch (pingError) {
      console.error(`❌ Ping failed: ${pingError.message}`);
    }
    
    // Try to resolve the hostname
    try {
      console.log('\nAttempting to resolve hostname:');
      const lookupResult = execSync(`getent hosts ${dbHost}`, { timeout: 5000 }).toString();
      console.log(lookupResult || 'No results from hostname lookup');
    } catch (lookupError) {
      console.error(`❌ Hostname lookup failed: ${lookupError.message}`);
    }
  }
  
  // Check system resources and processes
  console.log('\n=== SYSTEM RESOURCES ===');
  try {
    console.log('Process list:');
    const processList = execSync('ps aux', { timeout: 5000 }).toString();
    console.log(processList);
    
    console.log('\nNetwork connections:');
    const netstat = execSync('netstat -tuln', { timeout: 5000 }).toString();
    console.log(netstat);
  } catch (sysError) {
    console.error(`System check error: ${sysError.message}`);
  }
  
  // Check OpenSSL
  console.log('\n=== OPENSSL CHECK ===');
  try {
    const opensslVersion = execSync('openssl version', { timeout: 5000 }).toString();
    console.log(`OpenSSL version: ${opensslVersion}`);
  } catch (opensslError) {
    console.error(`❌ OpenSSL check failed: ${opensslError.message}`);
    console.log('Checking if OpenSSL is installed:');
    try {
      const findOpenSSL = execSync('which openssl || echo "Not found"', { timeout: 5000 }).toString();
      console.log(`OpenSSL binary: ${findOpenSSL}`);
    } catch (findError) {
      console.error(`Find OpenSSL failed: ${findError.message}`);
    }
  }
  
  console.log('\n=== DEBUGGING COMPLETE ===');
  
}, 3000); 