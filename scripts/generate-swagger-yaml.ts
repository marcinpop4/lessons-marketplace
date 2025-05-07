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
        path.join(projectRoot, 'server/errors/*.ts'),
        path.join(projectRoot, 'server/**/*.dto.ts'),
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

// --- START REFACTORED HELPER FUNCTIONS ---

/**
 * Logs discovered files and their OpenAPI annotation counts.
 * @param description - A description of the files being scanned (e.g., ".routes.ts").
 * @param files - An array of file paths.
 * @param projectRootPath - The root path of the project for relative logging.
 */
function _logDiscoveredFileAnnotations(description: string, files: string[], projectRootPath: string) {
    console.log(`Scanning ${files.length} ${description} file(s) for annotations...`);
    if (files.length === 0) {
        console.log(chalk.yellow(`  No ${description} files found to scan.`));
        return;
    }
    files.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const annotationCount = (content.match(/\* @openapi/g) || []).length;
            console.log(` - ${path.relative(projectRootPath, file)} (${chalk.blue(annotationCount)} annotation(s))`);
        } catch (readError) {
            console.warn(chalk.yellow(` - Error reading ${path.relative(projectRootPath, file)}: ${readError instanceof Error ? readError.message : readError}`));
        }
    });
}

/**
 * Finds files using the findFiles utility and then logs them with their annotation counts.
 * @param description - Description for logging (e.g., "route (.routes.ts)").
 * @param basePath - The base path to start searching from.
 * @param filterRegex - The regex to filter filenames.
 * @param projectRootPath - The project root path.
 */
function _findAndLogAnnotations(description: string, basePath: string, filterRegex: RegExp, projectRootPath: string) {
    const files = findFiles(basePath, filterRegex);
    _logDiscoveredFileAnnotations(description, files, projectRootPath);
}

/**
 * Logs initial messages, like the project root being used.
 * @param projectRootPath - The root path of the project.
 */
function _logInitialMessages(projectRootPath: string) {
    console.log(chalk.green(`Using project root: ${projectRootPath}`));
}

/**
 * Processes and logs route files.
 * @param projectRootPath - The root path of the project.
 */
function _processAndLogRouteFiles(projectRootPath: string) {
    const serverDir = path.join(projectRootPath, 'server');
    _findAndLogAnnotations('route (.routes.ts)', serverDir, /\.routes\.ts$/, projectRootPath);
}

/**
 * Processes and logs schema definition files (models, DTOs, errors).
 * @param projectRootPath - The root path of the project.
 */
function _processAndLogSchemaDefinitionFiles(projectRootPath: string) {
    // Log shared models (shared/models/*.ts)
    const modelsDir = path.join(projectRootPath, 'shared/models');
    _findAndLogAnnotations('shared model (shared/models/*.ts)', modelsDir, /\.ts$/, projectRootPath);

    // Log server DTOs (server/**/*.dto.ts)
    const serverDir = path.join(projectRootPath, 'server');
    _findAndLogAnnotations('server DTO (server/**/*.dto.ts)', serverDir, /\.dto\.ts$/, projectRootPath);

    // Log server error definitions (server/errors/*.ts)
    const errorsDir = path.join(projectRootPath, 'server/errors');
    _findAndLogAnnotations('server error definition (server/errors/*.ts)', errorsDir, /\.ts$/, projectRootPath);
}

/**
 * Generates the Swagger specification, converts it to YAML, and writes it to the output file.
 * Ensures the output directory exists.
 * @param options - The swagger-jsdoc options.
 * @param outputPath - The full path to save the swagger.yaml file.
 * @param outputDir - The directory where the swagger.yaml file will be saved.
 */
function _generateAndSaveSwaggerFile(options: any, outputPath: string, outputDir: string) {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(chalk.cyan(`Created Swagger output directory: ${outputDir}`));
    }

    console.log(chalk.cyan('Generating Swagger specification...'));
    const swaggerSpec = swaggerJsdoc(options);
    const swaggerYAML = yaml.dump(swaggerSpec);

    fs.writeFileSync(outputPath, swaggerYAML);
    console.log(chalk.greenBright(`Swagger YAML file generated and saved to ${outputPath}`));
}

// --- END REFACTORED HELPER FUNCTIONS ---

/**
 * Generates swagger.yaml file from JSDoc annotations.
 */
async function generateSwaggerYAML() {
    try {
        _logInitialMessages(projectRoot);

        _processAndLogRouteFiles(projectRoot);
        _processAndLogSchemaDefinitionFiles(projectRoot);

        _generateAndSaveSwaggerFile(swaggerOptions, SWAGGER_OUTPUT_PATH, SWAGGER_OUTPUT_DIR);

    } catch (error) {
        console.error(chalk.red('Error generating Swagger YAML:'));
        if (error instanceof Error) {
            console.error(chalk.red(error.message));
            if (error.stack) {
                console.error(chalk.gray(error.stack));
            }
        } else {
            console.error(chalk.red(String(error)));
        }
        process.exitCode = 1; // Indicate failure for CI or other scripts
    }
}

generateSwaggerYAML();
