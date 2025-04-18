import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

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

        // Add a proxy rule specifically for /api/v1
        '/api/v1': {
          target: 'http://localhost:3000', // Your backend server address
          changeOrigin: true,
          secure: false,
          // Optional: Rewrite path if backend doesn't expect /api/v1 prefix
          // rewrite: (path) => path.replace(/^\/api\/v1/, ''), 
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(`[VITE PROXY /api/v1] Sending request to target: ${options.target}${proxyReq.path}`);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log(`[VITE PROXY /api/v1] Received response from target: ${proxyRes.statusCode} ${req.url}`);
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
        // You might still need a separate rule for /api/health if it's not under /v1
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
