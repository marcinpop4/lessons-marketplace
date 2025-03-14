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

# Create necessary directory structure
RUN mkdir -p frontend

# Copy necessary files to match expected structure
RUN cp tsconfig.app.json frontend/ && \
    cp vite.config.ts frontend/ && \
    cp tsconfig.node.json frontend/ && \
    cp main.tsx frontend/ && \
    cp App.tsx frontend/ && \
    cp App.css frontend/ && \
    cp index.css frontend/ && \
    cp index.html frontend/ && \
    cp vite-env.d.ts frontend/

# Create subdirectories and copy files if they exist
RUN mkdir -p frontend/components && \
    if [ -d "components" ] && [ "$(ls -A components)" ]; then cp -r components/* frontend/components/; fi

RUN mkdir -p frontend/api && \
    if [ -d "api" ] && [ "$(ls -A api)" ]; then cp -r api/* frontend/api/; fi

RUN mkdir -p frontend/contexts && \
    if [ -d "contexts" ] && [ "$(ls -A contexts)" ]; then cp -r contexts/* frontend/contexts/; fi

RUN mkdir -p frontend/pages && \
    if [ -d "pages" ] && [ "$(ls -A pages)" ]; then cp -r pages/* frontend/pages/; fi

RUN mkdir -p frontend/styles && \
    if [ -d "styles" ] && [ "$(ls -A styles)" ]; then cp -r styles/* frontend/styles/; fi

RUN mkdir -p frontend/types && \
    if [ -d "types" ] && [ "$(ls -A types)" ]; then cp -r types/* frontend/types/; fi

RUN mkdir -p frontend/utils && \
    if [ -d "utils" ] && [ "$(ls -A utils)" ]; then cp -r utils/* frontend/utils/; fi

RUN mkdir -p frontend/services && \
    if [ -d "services" ] && [ "$(ls -A services)" ]; then cp -r services/* frontend/services/; fi

RUN mkdir -p frontend/layouts && \
    if [ -d "layouts" ] && [ "$(ls -A layouts)" ]; then cp -r layouts/* frontend/layouts/; fi

RUN mkdir -p frontend/hooks && \
    if [ -d "hooks" ] && [ "$(ls -A hooks)" ]; then cp -r hooks/* frontend/hooks/; fi

RUN mkdir -p frontend/assets && \
    if [ -d "assets" ] && [ "$(ls -A assets)" ]; then cp -r assets/* frontend/assets/; fi

RUN mkdir -p frontend/public && \
    if [ -d "public" ] && [ "$(ls -A public)" ]; then cp -r public/* frontend/public/; fi

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
