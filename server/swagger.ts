import swaggerJSDoc from 'swagger-jsdoc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Lessons Marketplace API',
        version: '1.0.0',
        description: 'API for the Lessons Marketplace application',
    },
    servers: [
        {
            url: 'http://localhost:3000/api/v1',
            description: 'Development server',
        },
        {
            url: '/api/v1',
            description: 'Production relative path',
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    security: [{ BearerAuth: [] }],
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    // Path to the API docs
    apis: [
        path.resolve(__dirname, './schemas/*.ts'),
        path.resolve(__dirname, './**/*.routes.ts'),
        path.resolve(__dirname, './**/*.router.ts'),
    ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec; 