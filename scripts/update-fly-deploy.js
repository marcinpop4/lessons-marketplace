#!/usr/bin/env tsx
/**
 * Script to update the Fly.io deployment process
 *
 * This script updates the existing Fly.io deployment script to use the new
 * environment configuration system.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
// Update package.json to add new scripts
const packageJsonPath = path.resolve(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
// Add or update environment scripts
const envScripts = {
    // Environment setup scripts
    "env:dev": "tsx scripts/env-config.ts development env",
    "env:docker": "tsx scripts/env-config.ts docker docker",
    "env:prod": "tsx scripts/env-config.ts production env",
    "env:fly-config": "tsx scripts/env-config.ts production fly-config",
    // Deploy scripts
    "fly:secrets:server": "tsx scripts/env-config.ts production fly-server",
    "fly:secrets:frontend": "tsx scripts/env-config.ts production fly-frontend",
    "fly:deploy:production": "pnpm env:fly-config && pnpm fly:secrets:server && pnpm fly:secrets:frontend && tsx docker/scripts/deploy-fly.ts --production",
};
// Update the scripts section
packageJson.scripts = {
    ...packageJson.scripts,
    ...envScripts
};
// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json with environment scripts');
// Update docker-compose.yml to use the generated .env file
// We'll create a function to check if we need to modify it
function updateDockerCompose() {
    const dockerComposePath = path.resolve(rootDir, 'docker/docker-compose.yml');
    if (fs.existsSync(dockerComposePath)) {
        let dockerComposeContent = fs.readFileSync(dockerComposePath, 'utf-8');
        // Check if we need to update the file
        if (!dockerComposeContent.includes('env_file')) {
            console.log('Updating docker-compose.yml to use .env file...');
            // Simple replacement approach - for complex YAML manipulation consider using a YAML parser
            // This example assumes a simple find/replace approach for environment properties
            dockerComposeContent = dockerComposeContent.replace(/environment:\s*-/g, 'env_file:\n      - ./.env\n    environment:\n      -');
            fs.writeFileSync(dockerComposePath, dockerComposeContent);
            console.log('Updated docker-compose.yml to use .env file');
        }
        else {
            console.log('docker-compose.yml already uses env_file, no update needed');
        }
    }
    else {
        console.log('docker-compose.yml not found, skipping update');
    }
}
// Run the updates
updateDockerCompose();
console.log('All updates completed successfully!');
console.log('Run "pnpm env:dev" to generate development environment');
console.log('Run "pnpm env:docker" to generate Docker environment');
console.log('Run "pnpm env:prod" to generate production environment');
console.log('Run "pnpm fly:deploy:production" to deploy to production');
