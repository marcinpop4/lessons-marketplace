import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'
import chalk from 'chalk';
import url from 'url'; // Import the url module

// --- Helper function to scrub sensitive data --- 
const scrubSensitiveData = (obj: any, keysToScrub: string[] = ['password', 'email', 'token', 'authorization', 'apiKey', 'secret']): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj; // Return non-objects as is
  }

  if (Array.isArray(obj)) {
    // Recursively scrub elements in arrays
    return obj.map(item => scrubSensitiveData(item, keysToScrub));
  }

  // Create a new object to avoid modifying the original
  const scrubbedObj: { [key: string]: any } = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (keysToScrub.includes(key.toLowerCase())) {
        scrubbedObj[key] = '[SCRUBBED]';
      } else {
        // Recursively scrub nested objects/arrays
        scrubbedObj[key] = scrubSensitiveData(obj[key], keysToScrub);
      }
    }
  }
  return scrubbedObj;
};
// --- End Helper function --- 

// --- Helper function to scrub URL parameters ---
const scrubUrlParams = (urlString: string | undefined, keysToScrub: string[] = ['password', 'email', 'token', 'authorization', 'apiKey', 'secret']): string => {
  if (!urlString) return '';
  try {
    const parsedUrl = url.parse(urlString, true); // Parse URL and query string
    if (parsedUrl.query) {
      const scrubbedQuery: { [key: string]: any } = {};
      for (const key in parsedUrl.query) {
        if (Object.prototype.hasOwnProperty.call(parsedUrl.query, key)) {
          if (keysToScrub.includes(key.toLowerCase())) {
            scrubbedQuery[key] = '[SCRUBBED]';
          } else {
            // Keep non-sensitive params, ensuring arrays are preserved if needed
            scrubbedQuery[key] = parsedUrl.query[key];
          }
        }
      }
      // Reconstruct URL with scrubbed query params
      // Using url.format ensures proper handling of path, query, etc.
      const formattedUrl = url.format({ ...parsedUrl, search: undefined, query: scrubbedQuery });
      // Decode the URL for clearer logging, converting %5B to [ and %5D to ]
      return decodeURIComponent(formattedUrl);
    } else {
      // No query parameters to scrub
      return urlString;
    }
  } catch (e) {
    console.warn('[VITE PROXY] Failed to parse/scrub URL parameters for logging:', urlString, e);
    return urlString; // Return original URL on error
  }
};
// --- End Helper function ---

// Get absolute path to the project root directory
const projectRoot = resolve(__dirname, '../..')

// Custom logic to avoid looking for tsconfig in the wrong place
const getTsConfigPath = () => {
  // Use environment variable if provided
  const envTsConfig = process.env.VITE_TSCONFIG
  if (envTsConfig) {
    return resolve(process.cwd(), envTsConfig)
  }

  // Default to the root tsconfig.json
  return resolve(projectRoot, 'tsconfig.json')
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Check if API Base URL is defined
  if (!process.env.VITE_API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL environment variable is required');
  }

  // Get log level from environment
  const logLevel = parseInt(process.env.VITE_LOG_LEVEL || '1', 10);

  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';

  // Only log in higher verbosity modes
  if (logLevel >= 2) {
    console.log(`Building for ${mode} with API URL: ${process.env.VITE_API_BASE_URL}`);
    console.log(`Environment type: ${process.env.NODE_ENV}`);
  }

  return {
    plugins: [
      react(),
      {
        // Custom plugin to override Vite's default TypeScript behavior
        name: 'custom-ts-config',
        config(config) {
          return {
            ...config,
            esbuild: {
              ...config.esbuild,
              tsconfigRaw: fs.readFileSync(getTsConfigPath(), 'utf-8')
            }
          }
        }
      }
    ],
    // Ensure environment variables with VITE_ prefix are exposed to the client
    envPrefix: 'VITE_',
    root: resolve(__dirname, '..'),
    // Disable caching in development
    optimizeDeps: {
      force: isDev,
      esbuildOptions: {
        tsconfigRaw: {
          compilerOptions: {
            baseUrl: '..',
            paths: {
              '@frontend/*': ['*'],
              '@shared/*': ['../shared/*'],
              '@config/*': ['config/*']
            }
          }
        }
      }
    },
    build: {
      outDir: resolve(projectRoot, 'dist/frontend'),
      rollupOptions: {
        // Explicitly set the tsconfig path for the build
        external: [],
        output: {
          manualChunks: {}
        }
      }
    },
    css: {
      postcss: resolve(__dirname, './postcss.config.ts'),
    },
    server: {
      // Configure based on log level
      logLevel: logLevel >= 3 ? 'info' : logLevel >= 2 ? 'warn' : 'error',
      // Force Vite to always use new versions of files
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: isDev,
      },
      headers: isDev ? {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      } : undefined,
      proxy: {
        '/api/v1': {
          target: 'http://localhost:3000', // Your backend server address
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            const disableLogs = process.env.DISABLE_VITE_PROXY_LOGS === 'true';

            proxy.on('proxyReq', (proxyReq, req, res) => {
              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => { (req as any)._body = body; });
            });

            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (!disableLogs) {
                const rawRequestBody = (req as any)._body || '';
                let scrubbedRequestBodyString = rawRequestBody;

                // Attempt to parse and scrub request body if not empty
                if (rawRequestBody) {
                  try {
                    const parsedBody = JSON.parse(rawRequestBody);
                    const scrubbedBody = scrubSensitiveData(parsedBody);
                    scrubbedRequestBodyString = JSON.stringify(scrubbedBody);
                  } catch (e) {
                    scrubbedRequestBodyString = rawRequestBody;
                    console.warn('[VITE PROXY /api/v1] Failed to parse/scrub request body for logging.');
                  }
                }

                // Capture response body
                let responseBodyChunks: Buffer[] = [];
                proxyRes.on('data', (chunk) => {
                  responseBodyChunks.push(chunk);
                });

                proxyRes.on('end', () => {
                  const rawResponseBody = Buffer.concat(responseBodyChunks).toString('utf8');
                  let scrubbedResponseBodyString = rawResponseBody;

                  // Attempt to parse and scrub response body if not empty
                  if (rawResponseBody) {
                    try {
                      const parsedResponseBody = JSON.parse(rawResponseBody);
                      const scrubbedResponseBody = scrubSensitiveData(parsedResponseBody);
                      scrubbedResponseBodyString = JSON.stringify(scrubbedResponseBody);
                    } catch (e) {
                      // Keep raw body if JSON parsing fails (might be compressed or not JSON)
                      scrubbedResponseBodyString = rawResponseBody;
                      console.warn('[VITE PROXY /api/v1] Failed to parse/scrub response body for logging.');
                    }
                  }

                  // Ensure empty bodies are represented as {}
                  const finalRequestBodyString = scrubbedRequestBodyString || '{}';
                  const finalResponseBodyString = scrubbedResponseBodyString || '{}';

                  // Scrub sensitive parameters from the URL before logging
                  const scrubbedUrl = scrubUrlParams(req.url);

                  // Log with request and response body separated by ==>
                  console.log(chalk.yellow(`${proxyRes.statusCode}\t${req.method}\t${scrubbedUrl}\t${finalRequestBodyString} ==>`), chalk.blue(`${finalResponseBodyString}`));
                });
              }
            });

            proxy.on('error', (err, req, res) => {
              console.error('[VITE PROXY /api/v1] Proxy error:', err);
              if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
              }
              res.end(JSON.stringify({ message: 'Proxy Error', error: err.message }));
            });
          }
        },
        '/api/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      alias: {
        '@shared': resolve(projectRoot, 'shared'),
        '@frontend': resolve(projectRoot, 'frontend'),
        '@config': resolve(__dirname, '.'),
        '@frontend/api': resolve(__dirname, '../api'),
        '@frontend/components': resolve(__dirname, '../components'),
        '@frontend/contexts': resolve(__dirname, '../contexts'),
        '@frontend/hooks': resolve(__dirname, '../hooks'),
        '@frontend/pages': resolve(__dirname, '../pages'),
        '@frontend/styles': resolve(__dirname, '../styles'),
        '@frontend/theme': resolve(__dirname, '../theme'),
        '@frontend/types': resolve(__dirname, '../types'),
        '@frontend/utils': resolve(__dirname, '../utils'),
      }
    }
  }
})
