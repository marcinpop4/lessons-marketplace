# Lessons Marketplace

This project is a platform for connecting students and parents with 1:1 instructors.

## Features

- **Full-stack TypeScript** application with React frontend and Node.js backend
- **Real-time learning objectives** with AI-powered recommendations
- **Comprehensive user management** for students and teachers
- **Lesson scheduling and quote system** for flexible booking
- **Unified logging system** with Pino for structured monitoring
- **Docker containerization** for consistent development and deployment
- **Comprehensive test suite** with unit, API, and E2E testing

## Development Setup

Follow these steps to set up your local development environment from a completely clean checkout.

### Prerequisites

1. **Node.js**: Install Node.js version 20 or later:
   ```bash
   # Using Homebrew on macOS
   brew install node@20
   
   # Or download directly from https://nodejs.org/
   ```

2. **pnpm**: Install pnpm version 10.3.0 or later:
   ```bash
   # Using npm
   npm install -g pnpm@10.3.0
   
   # Or using Homebrew on macOS
   brew install pnpm
   ```

3. **Docker**: Install Docker Desktop for your platform:
   ```bash
   # Using Homebrew on macOS
   brew install --cask docker
   
   # Or download from https://www.docker.com/products/docker-desktop/
   ```

### Quick Start (from clean checkout)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd lessons-marketplace
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment files**:
   ```bash
   # Copy example environment files (create these from your project needs)
   cp env/.env.example env/.env.development
   cp env/.env.example env/.env.test
   
   # Edit the files with your specific configuration if needed
   # The defaults should work for local development
   ```

4. **Validate the entire setup** (recommended):
   ```bash
   NODE_ENV=development pnpm validate:full
   ```
   
   This comprehensive script will:
   - Clean any existing Docker containers
   - Build fresh Docker images
   - Start all services (server, frontend, database, observability stack)
   - Install dependencies in containers
   - Run database migrations
   - Generate Prisma client
   - Seed the database with test data
   - Run all test suites (unit, API, E2E)
   - Provide detailed timing reports
   
   If this command succeeds, your development environment is fully working!

5. **Alternative: Fast setup** (skip Docker rebuild):
   ```bash
   NODE_ENV=development pnpm validate:fast
   ```
   
   Use this if you've already run the full validation before and just want to quickly verify everything still works.

## Docker Development

The application runs entirely in Docker for consistent development across different machines.

### Development Workflow

```bash
# Start all services
NODE_ENV=development pnpm dev:up

# View logs from all services
NODE_ENV=development pnpm dev:logs

# Stop all services
NODE_ENV=development pnpm dev:down

# Clean everything (containers, volumes, networks)
NODE_ENV=development pnpm dev:clean

# Rebuild Docker images
NODE_ENV=development pnpm dev:build
```

### Services Available

When running, these services will be available:
- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend API**: `http://localhost:3000` (Express server)
- **API Documentation**: `http://localhost:3000/api-docs` (Swagger UI)
- **Database**: PostgreSQL (internal Docker network)
- **Observability Stack**: 
  - Grafana: `http://localhost:3001` (monitoring dashboards)
  - Loki: `http://localhost:3100` (log aggregation)

### Database Operations

```bash
# Run migrations
NODE_ENV=development pnpm prisma:migrate

# Reset database (destructive)
NODE_ENV=development pnpm prisma:reset

# Seed the database with test data
NODE_ENV=development pnpm prisma:seed

# Open Prisma Studio (database GUI)
NODE_ENV=development pnpm prisma:studio
```

### Testing

```bash
# Run all tests
NODE_ENV=development pnpm test:all

# Run specific test suites
NODE_ENV=development pnpm test:unit
NODE_ENV=development pnpm test:api
NODE_ENV=development pnpm test:e2e
```

### Environment Support

All commands support different environments:

```bash
# Development (default)
NODE_ENV=development pnpm dev:up

# Test environment
NODE_ENV=test pnpm dev:up
```

### Manual Setup

If you prefer step-by-step setup or the automated validation fails:

1. **Start Docker services**:
   ```bash
   NODE_ENV=development pnpm dev:up
   ```

2. **Install dependencies in containers**:
   ```bash
   NODE_ENV=development pnpm dev:install
   ```

3. **Set up the database**:
   ```bash
   NODE_ENV=development pnpm prisma:setup
   ```

4. **Run tests to verify**:
   ```bash
   NODE_ENV=development pnpm test:all
   ```

### Troubleshooting

If you encounter issues:

1. **Clean and rebuild everything**:
   ```bash
   NODE_ENV=development pnpm dev:clean
   NODE_ENV=development pnpm dev:build
   NODE_ENV=development pnpm validate:full
   ```

2. **Check service logs**:
   ```bash
   NODE_ENV=development pnpm dev:logs
   ```

3. **Access container shells for debugging**:
   ```bash
   # Server container
   NODE_ENV=development pnpm dev:shell:server
   
   # Frontend container  
   NODE_ENV=development pnpm dev:shell:frontend
   ```

## Logging System

The application includes a comprehensive logging system for monitoring and debugging:

### Features
- **High-performance structured logging** with Pino
- **Request correlation** via unique request IDs
- **Automatic log aggregation** from frontend to backend
- **Security-first approach** with automatic data redaction
- **Real-time log streaming** to observability stack
- **Client-side error tracking** and user behavior analytics

### Accessing Logs

- **Development console**: Logs are displayed with pretty formatting
- **Grafana dashboards**: `http://localhost:3001` for visual log analysis
- **Container logs**: `NODE_ENV=development pnpm dev:logs`

## API Documentation

Interactive API documentation is available at `http://localhost:3000/api-docs` when the server is running.

## Testing Strategy

The project includes comprehensive testing at multiple levels:

- **Unit Tests**: Fast, isolated tests for individual functions and components
- **API Tests**: Integration tests for REST endpoints using Supertest
- **E2E Tests**: End-to-end browser tests using Playwright

All tests run in Docker to ensure consistency across environments.
