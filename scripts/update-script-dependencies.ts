#!/usr/bin/env tsx
/**
 * Script to update application scripts to use environment configuration
 * 
 * This script modifies key application scripts to ensure they first generate
 * the appropriate environment files before execution.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory path in ES module format
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load package.json
const packageJsonPath = path.resolve(rootDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Scripts that should run after generating the development environment
const devDependentScripts = {
  "dev": "pnpm env:dev && cross-env VITE_TSCONFIG=frontend/config/tsconfig.app.json vite --config frontend/config/vite.config.ts --force",
  "dev:clear-cache": "pnpm env:dev && rm -rf node_modules/.vite && cross-env VITE_TSCONFIG=frontend/config/tsconfig.app.json vite --config frontend/config/vite.config.ts --force",
  "dev:server": "pnpm env:dev && tsx watch server/index.ts",
  "dev:server:debug": "pnpm env:dev && cross-env DEBUG=true tsx watch server/index.ts",
  "test": "pnpm env:dev && tsx scripts/run-tests.ts",
  "test:unit": "pnpm env:dev && tsx scripts/run-tests.ts tests/unit",
  "test:e2e": "pnpm env:dev && playwright test --reporter=list",
  "test:e2e:html": "pnpm env:dev && playwright test",
  "prisma:migrate": "pnpm env:dev && prisma migrate dev --schema=server/prisma/schema.prisma",
  "prisma:seed": "pnpm env:dev && tsx server/prisma/seed.ts",
  "prisma:studio": "pnpm env:dev && prisma studio --schema=server/prisma/schema.prisma",
};

// Scripts that should run after generating the Docker environment
const dockerDependentScripts = {
  "docker:up": "pnpm env:docker && docker compose -f docker/docker-compose.yml up -d",
  "docker:build": "pnpm env:docker && docker compose -f docker/docker-compose.yml build",
  "docker:test:setup": "pnpm docker:clean && pnpm env:docker && pnpm docker:build && pnpm docker:up && sleep 5 && pnpm docker:migrate && pnpm docker:seed",
};

// Scripts that should run with development env/config loaded and have concurrent operation
const concurrentScripts = {
  "dev:full": "pnpm env:dev && concurrently \"pnpm run dev\" \"pnpm run dev:server\"",
  "dev:full:clear-cache": "pnpm env:dev && concurrently \"pnpm run dev:clear-cache\" \"pnpm run dev:server\"",
};

// Update all script groups in package.json
packageJson.scripts = {
  ...packageJson.scripts,
  ...devDependentScripts,
  ...dockerDependentScripts,
  ...concurrentScripts,
};

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated application scripts to generate environment files before execution');
console.log('\nKey updates:');
console.log('- Development scripts now run: pnpm env:dev first');
console.log('- Docker scripts now run: pnpm env:docker first');
console.log('- Test scripts now run: pnpm env:dev first');
console.log('\nYou can now run commands like:');
console.log('- pnpm dev (generates dev environment and starts the frontend)');
console.log('- pnpm dev:server (generates dev environment and starts the backend)');
console.log('- pnpm docker:up (generates docker environment and starts containers)');
console.log('- pnpm test (generates dev environment and runs tests)'); 