FROM nginx:alpine

# Remove default nginx configuration
RUN rm -rf /etc/nginx/conf.d/*

# Copy custom nginx configuration template
COPY frontend/config/nginx/nginx.conf /etc/nginx/templates/default.conf.template

# Copy built frontend files
COPY dist/frontend /usr/share/nginx/html

# Set environment variables that will be available during template processing
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d
ENV NGINX_ENVSUBST_TEMPLATE_DIR=/etc/nginx/templates

# Expose port 80
EXPOSE 80

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"] 