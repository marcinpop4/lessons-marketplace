import fs from 'fs';

// Check environments
const isFlyIo = process.env.FLY_APP_NAME !== undefined;
const isProduction = process.env.NODE_ENV === 'production';
const isDocker = process.env.CONTAINER_ENV === 'true' || 
                 process.env.CONTAINER_ENV === '1' ||
                 fs.existsSync('/.dockerenv');

// Get API URL from environment variables - no fallbacks
const apiBaseUrl = process.env.VITE_API_BASE_URL;

// Fail fast if API URL is not set
if (!apiBaseUrl) {
  console.error('ERROR: VITE_API_BASE_URL environment variable is required');
  process.exit(1);
}

// In Docker environment, special case for browser compatibility
if (isDocker && !isFlyIo && 
    (apiBaseUrl.includes('localhost:3000') || apiBaseUrl.includes('api:3000'))) {
  console.log(`Converting absolute API URL to relative path for browser compatibility`);
  // Use relative path for browser requests in Docker
  const browserApiUrl = '/api';
  
  console.log(`Creating frontend config with API URL: ${browserApiUrl}`);
  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, Docker=${isDocker}, Fly.io=${isFlyIo}`);
  
  // Create the config content with relative path
  const configContent = `window.API_CONFIG = { 
    BASE_URL: "${browserApiUrl}",
    ENV: "${process.env.NODE_ENV || 'production'}" 
  };
  console.log("Frontend config loaded with API_BASE_URL:", "${browserApiUrl}");`;
  
  // Write to the appropriate location
  const outputPath = '/usr/share/nginx/html/config.js';
  fs.writeFileSync(outputPath, configContent);
  
  console.log(`Created config.js with API_BASE_URL: ${browserApiUrl}`);
} else {
  // Use the actual API URL from environment variable
  console.log(`Creating frontend config with API URL: ${apiBaseUrl}`);
  console.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, Docker=${isDocker}, Fly.io=${isFlyIo}`);
  
  // Create the config content
  const configContent = `window.API_CONFIG = { 
    BASE_URL: "${apiBaseUrl}",
    ENV: "${process.env.NODE_ENV || 'production'}" 
  };
  console.log("Frontend config loaded with API_BASE_URL:", "${apiBaseUrl}");`;
  
  // Write to the appropriate location
  const outputPath = '/usr/share/nginx/html/config.js';
  fs.writeFileSync(outputPath, configContent);
  
  console.log(`Created config.js with API_BASE_URL: ${apiBaseUrl}`);
} 