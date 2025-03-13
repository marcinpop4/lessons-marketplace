FROM node:20-slim as build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies at the root level
RUN pnpm install --frozen-lockfile

# Copy necessary files for building the frontend
COPY tsconfig.json ./
COPY frontend/ ./frontend/
COPY shared/ ./shared/
COPY server/tsconfig.server.json ./server/tsconfig.server.json

# Build the frontend only (not the server)
RUN pnpm exec tsc --project frontend/tsconfig.app.json --skipLibCheck && pnpm exec vite build --config frontend/vite.config.ts

# Production stage with Nginx
FROM nginx:alpine

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy a custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create a runtime configuration script that will be populated at container startup
COPY frontend/create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 