#!/usr/bin/env node

/**
 * Debug script to troubleshoot URL resolution issues in Docker environment
 * 
 * This script:
 * 1. Checks the environment variables used for URL construction
 * 2. Tests network connectivity to the frontend service
 * 3. Verifies URL resolution works correctly
 */

import { execSync } from 'child_process';
import http from 'http';
import url from 'url';

// Log all environment variables related to frontend URLs
console.log('=== URL Environment Variables ===');
console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
console.log(`DOCKER_FRONTEND_URL: ${process.env.DOCKER_FRONTEND_URL}`);
console.log(`TEST_ENV: ${process.env.TEST_ENV}`);
console.log(`Running in Docker: ${process.env.TEST_ENV === 'docker'}`);

// Determine the base URL that would be used in tests
const baseUrl = process.env.TEST_ENV === 'docker' 
  ? process.env.DOCKER_FRONTEND_URL 
  : process.env.FRONTEND_URL;

console.log(`Effective base URL: ${baseUrl}`);

// Check how paths would be resolved
console.log('\n=== URL Resolution Check ===');
const paths = ['/login', '/register', '/teacher-dashboard'];
paths.forEach(path => {
  const resolvedUrl = new URL(path, baseUrl).toString();
  console.log(`${path} → ${resolvedUrl}`);
});

// Test network connectivity
console.log('\n=== Network Connectivity Test ===');

// Function to ping a host
const pingHost = (host) => {
  try {
    console.log(`Pinging ${host}...`);
    execSync(`ping -c 3 ${host}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Cannot ping ${host}: ${error.message}`);
    return false;
  }
};

// Function to check HTTP connectivity
const checkHttp = (urlToCheck) => {
  return new Promise((resolve) => {
    console.log(`Testing HTTP connectivity to ${urlToCheck}`);
    
    const parsedUrl = url.parse(urlToCheck);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.path || '/',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      resolve(res.statusCode);
    });
    
    req.on('error', (error) => {
      console.error(`HTTP connection failed: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('HTTP connection timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

// Extract hostname from Docker frontend URL
const frontendHost = baseUrl ? new URL(baseUrl).hostname : 'frontend';

// Run tests sequentially
const runTests = async () => {
  // Test DNS resolution
  pingHost(frontendHost);
  
  // Test HTTP connectivity to base URL
  if (baseUrl) {
    await checkHttp(baseUrl);
  } else {
    console.log('No base URL defined, skipping HTTP check');
  }
  
  // Test HTTP connectivity with path
  if (baseUrl) {
    await checkHttp(new URL('/login', baseUrl).toString());
  }
  
  console.log('\n=== DNS Resolution Test ===');
  try {
    console.log('Checking /etc/hosts:');
    execSync('cat /etc/hosts', { stdio: 'inherit' });
    
    console.log('\nChecking DNS resolution:');
    execSync(`getent hosts ${frontendHost}`, { stdio: 'inherit' });
  } catch (error) {
    console.error(`DNS test failed: ${error.message}`);
  }
};

runTests().catch(console.error); 