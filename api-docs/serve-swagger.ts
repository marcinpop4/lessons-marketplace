import express from 'express';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3030;

// Get the directory of the current module in ES modules
const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

// Serve static files from api-docs directory
app.use(express.static(currentDir));

// Default route to serve swagger UI
app.get('/', (req, res) => {
  res.sendFile(path.join(currentDir, 'swagger-ui.html'));
});

// Function to open browser based on platform
const openBrowser = (url: string) => {
  const platform = process.platform;
  let command = '';
  
  switch (platform) {
    case 'darwin': // macOS
      command = `open ${url}`;
      break;
    case 'win32': // Windows
      command = `start ${url}`;
      break;
    default: // Linux and others
      command = `xdg-open ${url}`;
      break;
  }
  
  exec(command, (error) => {
    if (error) {
      console.error(`Failed to open browser: ${error.message}`);
    }
  });
};

// Start the server
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Swagger UI available at ${url}`);
  console.log('Press Ctrl+C to stop the server');
  
  // Open the browser automatically
  openBrowser(url);
}); 