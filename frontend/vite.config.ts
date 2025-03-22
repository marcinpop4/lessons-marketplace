import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  build: {
    outDir: '../dist/frontend'
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
      '@frontend': resolve(__dirname, '.'),
      '@frontend/api': resolve(__dirname, './api'),
      '@frontend/components': resolve(__dirname, './components'),
      '@frontend/contexts': resolve(__dirname, './contexts'),
      '@frontend/hooks': resolve(__dirname, './hooks'),
      '@frontend/pages': resolve(__dirname, './pages'),
      '@frontend/styles': resolve(__dirname, './styles'),
      '@frontend/theme': resolve(__dirname, './theme'),
      '@frontend/types': resolve(__dirname, './types'),
      '@frontend/utils': resolve(__dirname, './utils'),
      '@frontend/shared': resolve(__dirname, './shared')
    }
  }
})
