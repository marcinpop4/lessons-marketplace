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
    proxy: {
      // More specific API routes first
      '/api/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/api/teachers': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/api/lesson-requests': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/api/lesson-quotes': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/api/lessons': {
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
      '@': resolve(__dirname, './src'),
      '@api': resolve(__dirname, './api'),
      '@components': resolve(__dirname, './components'),
      '@contexts': resolve(__dirname, './contexts'),
      '@pages': resolve(__dirname, './pages'),
      '@styles': resolve(__dirname, './styles'),
      '@types': resolve(__dirname, './types')
    }
  }
})
