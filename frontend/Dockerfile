FROM node:20-slim as build

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY . .

# Build the frontend with skipLibCheck to avoid TypeScript errors
ENV NODE_ENV=production
RUN pnpm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy the built frontend from the build stage
COPY --from=build /app/dist/frontend /usr/share/nginx/html

# Copy a custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a runtime configuration script that will be populated at container startup
COPY create-config.sh /docker-entrypoint.d/40-create-config.sh
RUN chmod +x /docker-entrypoint.d/40-create-config.sh

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
