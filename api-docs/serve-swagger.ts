// import * as express from 'express';
import express from 'express';
// import * as swaggerUi from 'swagger-ui-express';
import * as swaggerUi from 'swagger-ui-express';
// import * as fs from 'fs';
import * as fs from 'fs'; // Keep namespace import
// import * as path from 'path'; // Use namespace import for path
import path from 'path'; // Keep default import (esModuleInterop)
// import * as yaml from 'js-yaml'; // Use namespace import for yaml
import * as yaml from 'js-yaml'; // Keep namespace import
import { fileURLToPath } from 'url'; // Import fileURLToPath

// Use import.meta.url to determine the script's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate project root relative to the script's location
// When running compiled from dist/swagger/api-docs, go up 3 levels
const projectRoot = path.resolve(__dirname, '../../../');

// Set paths based on project root
const SWAGGER_YAML_PATH = path.join(projectRoot, 'dist/swagger/swagger.yaml');
const PORT = process.env.PORT || 3030;

// Create Express app
const app = express();

// Setup Swagger documentation route
try {
  if (!fs.existsSync(SWAGGER_YAML_PATH)) {
    throw new Error(`Swagger YAML file not found at: ${SWAGGER_YAML_PATH}`);
  }

  const swaggerDocument = yaml.load(fs.readFileSync(SWAGGER_YAML_PATH, 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  app.get('/', (req, res) => {
    res.redirect('/api-docs');
  });

  app.listen(PORT, () => {
    console.log(`Swagger UI is running at http://localhost:${PORT}/api-docs`);
  });
} catch (error) {
  console.error('Error serving Swagger documentation:', error);
  process.exit(1);
} 