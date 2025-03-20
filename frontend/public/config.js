// Development configuration for local environment
window.API_CONFIG = { 
  BASE_URL: "/api", // Will be proxied by Vite to http://localhost:3000/api
  VERSION: Date.now() // Add a timestamp to prevent caching
}; 