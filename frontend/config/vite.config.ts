import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs'

// Custom logic to avoid looking for tsconfig in the wrong place
const getTsConfigPath = () => {
  // Use environment variable if provided
  const envTsConfig = process.env.VITE_TSCONFIG
  if (envTsConfig) {
    return resolve(process.cwd(), envTsConfig)
  }
  
  // Default to the config directory
  return resolve(__dirname, './tsconfig.app.json')
}

// Get absolute path to the project root directory
const projectRoot = resolve(__dirname, '../..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Define variables to be replaced in the app
  const envPrefix = 'VITE_';
  
  // If we're in production and VITE_API_BASE_URL isn't defined, set a default
  if (mode === 'production' && !env.VITE_API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL must be defined in production. Make sure it is set in fly.frontend.toml');
  }
  
  // Log the API URL being used
  console.log(`Building for ${mode} with API URL: ${env.VITE_API_BASE_URL}`);
  
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
    root: resolve(__dirname, '..'),
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
      // Force Vite to always use new versions of files and not serve from memory cache
      hmr: {
        overlay: true,
      },
      watch: {
        usePolling: true,
      },
      headers: {
        // Prevent browser caching in development mode
        'Cache-Control': 'no-store'
      },
      proxy: {
        // Versioned API routes
        '/api/v1/auth': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        },
        '/api/v1/teachers': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        },
        '/api/v1/lesson-requests': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        },
        '/api/v1/lesson-quotes': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        },
        '/api/v1/lessons': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        },
        '/api/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    resolve: {
      alias: {
        '@frontend': resolve(__dirname, '..'),
        '@frontend/api': resolve(__dirname, '../api'),
        '@frontend/components': resolve(__dirname, '../components'),
        '@frontend/contexts': resolve(__dirname, '../contexts'),
        '@frontend/hooks': resolve(__dirname, '../hooks'),
        '@frontend/pages': resolve(__dirname, '../pages'),
        '@frontend/styles': resolve(__dirname, '../styles'),
        '@frontend/theme': resolve(__dirname, '../theme'),
        '@frontend/types': resolve(__dirname, '../types'),
        '@frontend/utils': resolve(__dirname, '../utils'),
        '@shared': resolve(__dirname, '../../shared'),
        '@config': resolve(__dirname, '.') // Add an alias for the config directory
      }
    },
    optimizeDeps: {
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
    }
  }
})
