FROM postgres:16

# Enable command trace for all RUN instructions
SHELL ["/bin/bash", "-cx"]

# Install additional utilities for health checks
RUN apt-get update && \
    apt-get install -y curl jq procps && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy database initialization scripts
COPY docker/database/init/ /docker-entrypoint-initdb.d/

# Make initialization scripts executable
RUN chmod +x /docker-entrypoint-initdb.d/*.sh

# Expose the PostgreSQL port
EXPOSE 5432

# Default command is inherited from the postgres image
CMD ["postgres"] 