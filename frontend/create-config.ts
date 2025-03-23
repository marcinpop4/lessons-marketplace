import fs from 'fs';

// Get the API URL from environment variables
// For Docker, we need to point to the API service
const apiBaseUrl = process.env.VITE_API_BASE_URL;

// Fail fast if the environment variable is not set
if (!apiBaseUrl) {
  throw new Error('VITE_API_BASE_URL environment variable is required');
}

// Create the config content with the correct API path
// The frontend nginx will proxy /api to the API service
const configContent = `window.API_CONFIG = { BASE_URL: "${apiBaseUrl}" };`;

// Write directly to the nginx html directory in Docker
const outputPath = '/usr/share/nginx/html/config.js';
fs.writeFileSync(outputPath, configContent);

console.log(`Created config.js with API_BASE_URL: ${apiBaseUrl}`); 