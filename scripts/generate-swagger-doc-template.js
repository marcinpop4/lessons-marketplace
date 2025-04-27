#!/usr/bin/env node

/**
 * This script helps generate Swagger documentation templates for your route files.
 * It scans your server directory for route files and outputs information about the routes.
 * 
 * Usage: node scripts/generate-swagger-doc-template.js [path-to-route-file]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_DIR = path.resolve(__dirname, '../server');

// Regular expressions for finding routes
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const ROUTE_REGEX = new RegExp(`router\\.(${HTTP_METHODS.join('|')})\\(['"]([^'"]+)['"]`, 'g');
const ROUTE_REGEX_SINGLE = new RegExp(`router\\.(${HTTP_METHODS.join('|')})\\(['"]([^'"]+)['"]`);

// Templates for swagger documentation
const SWAGGER_TEMPLATE = {
  GET: (path) => `/**
 * @openapi
 * ${formatPath(path)}:
 *   get:
 *     summary: [REPLACE] Get resource
 *     description: [REPLACE] Detailed description
 *     tags:
 *       - [REPLACE] Tag
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: [REPLACE] parameter_name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: [REPLACE] Parameter description
 *     responses:
 *       '200':
 *         description: [REPLACE] Success response description
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/[REPLACE]'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: [REPLACE] Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */`,
  POST: (path) => `/**
 * @openapi
 * ${formatPath(path)}:
 *   post:
 *     summary: [REPLACE] Create resource
 *     description: [REPLACE] Detailed description
 *     tags:
 *       - [REPLACE] Tag
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               [REPLACE] property:
 *                 type: string
 *             required:
 *               - [REPLACE] property
 *     responses:
 *       '201':
 *         description: [REPLACE] Created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/[REPLACE]'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */`,
  PUT: (path) => `/**
 * @openapi
 * ${formatPath(path)}:
 *   put:
 *     summary: [REPLACE] Update resource
 *     description: [REPLACE] Detailed description
 *     tags:
 *       - [REPLACE] Tag
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: [REPLACE] parameter_name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: [REPLACE] Parameter description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               [REPLACE] property:
 *                 type: string
 *             required:
 *               - [REPLACE] property
 *     responses:
 *       '200':
 *         description: [REPLACE] Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/[REPLACE]'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: [REPLACE] Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */`,
  PATCH: (path) => `/**
 * @openapi
 * ${formatPath(path)}:
 *   patch:
 *     summary: [REPLACE] Partially update resource
 *     description: [REPLACE] Detailed description
 *     tags:
 *       - [REPLACE] Tag
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: [REPLACE] parameter_name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: [REPLACE] Parameter description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               [REPLACE] property:
 *                 type: string
 *     responses:
 *       '200':
 *         description: [REPLACE] Updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/[REPLACE]'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: [REPLACE] Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */`,
  DELETE: (path) => `/**
 * @openapi
 * ${formatPath(path)}:
 *   delete:
 *     summary: [REPLACE] Delete resource
 *     description: [REPLACE] Detailed description
 *     tags:
 *       - [REPLACE] Tag
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: [REPLACE] parameter_name
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: [REPLACE] Parameter description
 *     responses:
 *       '200':
 *         description: [REPLACE] Deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: [REPLACE] Not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */`,
};

// Helper to format path for Swagger docs
function formatPath(path) {
  // Replace :param with {param} for Swagger path format
  return path.replace(/:([^/]+)/g, '{$1}');
}

// Find all routes files
function findRouteFiles() {
  const routeFiles = [];
  
  function searchDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        searchDirectory(filePath);
      } else if (
        stats.isFile() && 
        (file.endsWith('.routes.ts') || file.endsWith('.router.ts'))
      ) {
        routeFiles.push(filePath);
      }
    }
  }
  
  searchDirectory(SERVER_DIR);
  return routeFiles;
}

// Extract routes from a file
function extractRoutes(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  let match;
  
  while ((match = ROUTE_REGEX.exec(content)) !== null) {
    const method = match[1];
    const path = match[2];
    routes.push({ method, path });
  }
  
  return routes;
}

// Generate Swagger template for routes
function generateSwaggerTemplate(routes) {
  return routes.map(route => {
    const method = route.method.toUpperCase();
    const template = SWAGGER_TEMPLATE[method];
    if (template) {
      return template(route.path);
    }
    return null;
  }).filter(Boolean).join('\n\n');
}

// Main function
function main() {
  const targetFile = process.argv[2];
  
  if (targetFile) {
    // Process specific file
    const filePath = path.resolve(process.cwd(), targetFile);
    if (fs.existsSync(filePath)) {
      const routes = extractRoutes(filePath);
      console.log(`Found ${routes.length} routes in ${targetFile}`);
      if (routes.length > 0) {
        console.log('\nSwagger Documentation Templates:');
        console.log(generateSwaggerTemplate(routes));
      }
    } else {
      console.error(`File not found: ${targetFile}`);
      process.exit(1);
    }
  } else {
    // List all route files
    const routeFiles = findRouteFiles();
    console.log(`Found ${routeFiles.length} route files:`);
    
    for (const file of routeFiles) {
      const relativePath = path.relative(process.cwd(), file);
      const routes = extractRoutes(file);
      console.log(`\n${relativePath} (${routes.length} routes):`);
      
      for (const route of routes) {
        console.log(`  ${route.method.toUpperCase()} ${route.path}`);
      }
    }
    
    console.log('\nTo generate Swagger templates for a specific file, run:');
    console.log('node scripts/generate-swagger-doc-template.js <path-to-route-file>');
  }
}

main(); 