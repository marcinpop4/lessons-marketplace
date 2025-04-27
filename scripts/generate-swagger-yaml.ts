import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import swaggerJsdoc from 'swagger-jsdoc';
import chalk from 'chalk';

// Get the current file path for ES modules
const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);

// Determine if we're running from dist directory after compilation
const isRunningCompiled = currentFilePath.includes('/dist/swagger/');

// Adjust to find the project root correctly whether running compiled or not
let projectRoot: string;
if (isRunningCompiled) {
    // Go up 3 levels: scripts -> swagger -> dist -> project root
    projectRoot = path.resolve(currentDir, '../../../');
} else {
    // Go up 1 level: scripts -> project root
    projectRoot = path.resolve(currentDir, '../');
}

// Set up paths
const SWAGGER_OUTPUT_DIR = path.join(projectRoot, 'dist/swagger');
const SWAGGER_OUTPUT_PATH = path.join(SWAGGER_OUTPUT_DIR, 'swagger.yaml');

// Define the Swagger options
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Lessons Marketplace API',
            version: '1.0.0',
            description: 'API documentation for the Lessons Marketplace application',
        },
        servers: [
            {
                url: 'http://localhost:3000/api/v1',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"',
                }
            }
        }
    },
    apis: [
        path.join(projectRoot, 'server/**/*.routes.ts'),
        path.join(projectRoot, 'shared/models/*.ts'),
        path.join(projectRoot, 'shared/dtos/*.ts'),
        path.join(projectRoot, 'server/errors/*.ts'),
    ],
};

/** Helper function to find files matching a pattern */
function findFiles(startPath: string, filter: RegExp): string[] {
    let results: string[] = [];
    if (!fs.existsSync(startPath)) {
        console.warn(`Directory to scan does not exist: ${startPath}`);
        return [];
    }

    const files = fs.readdirSync(startPath);
    for (let i = 0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            results = results.concat(findFiles(filename, filter)); // Recurse
        } else if (filter.test(filename)) {
            results.push(filename);
        }
    }
    return results;
}

/**
 * Generates swagger.yaml file from the JSDoc annotations in route files
 */
async function generateSwaggerYAML() {
    try {
        console.log(`Using project root: ${projectRoot}`);

        // Find the specific .routes.ts files
        const serverDir = path.join(projectRoot, 'server');
        const routeFiles = findFiles(serverDir, /\.routes\.ts$/);
        console.log(`Scanning ${routeFiles.length} .routes.ts files for annotations...`);

        // Log annotation count per file (Routes)
        routeFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const annotationCount = (content.match(/\* @openapi/g) || []).length;
                console.log(` - ${path.relative(projectRoot, file)} (${chalk.blue(annotationCount)})`);
            } catch (readError) {
                console.warn(` - Error reading ${path.relative(projectRoot, file)}: ${readError}`);
            }
        });

        // Find and log schema definition files
        const modelsDir = path.join(projectRoot, 'shared/models');
        const dtosDir = path.join(projectRoot, 'shared/dtos');
        const errorsDir = path.join(projectRoot, 'server/errors');
        const schemaFiles = [
            ...findFiles(modelsDir, /\.ts$/),
            ...findFiles(dtosDir, /\.ts$/),
            ...findFiles(errorsDir, /\.ts$/)
        ];
        console.log(`Scanning ${schemaFiles.length} potential schema files for annotations...`);
        schemaFiles.forEach(file => {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const annotationCount = (content.match(/\* @openapi/g) || []).length;
                console.log(` - ${path.relative(projectRoot, file)} (${chalk.blue(annotationCount)})`);
            } catch (readError) {
                console.warn(` - Error reading ${path.relative(projectRoot, file)}: ${readError}`);
            }
        });

        // Generate the Swagger YAML file
        const swaggerSpec = swaggerJsdoc(swaggerOptions);
        const swaggerYAML = yaml.dump(swaggerSpec);

        // Save the Swagger YAML file
        fs.writeFileSync(SWAGGER_OUTPUT_PATH, swaggerYAML);
        console.log(`Swagger YAML file generated and saved to ${SWAGGER_OUTPUT_PATH}`);
    } catch (error) {
        console.error(`Error generating Swagger YAML: ${error}`);
    }
}

generateSwaggerYAML();
