# Lessons Marketplace

This project is a platform for connecting students and parents with 1:1 instructors.

## Development Setup

Follow these steps to set up your local development environment.

### Prerequisites

1.  **Node.js**: Version 20 or later.
2.  **pnpm**: Version 10.3.0 or later. Install using `npm install -g pnpm`.
3.  **PostgreSQL**: Version 15. Install using Homebrew:
    ```bash
    brew install postgresql@15
    brew services start postgresql@15
    ```
4.  **Create Database**: Connect to PostgreSQL and create the development database.
    ```bash
    # Connect with your system username (no need for -U flag on macOS with brew)
    psql postgres
    CREATE DATABASE arts_marketplace;
    \q
    ```
5.  **Environment File**: Copy `env/.env.development.example` to `env/.env.development` and update `DATABASE_URL` if your local PostgreSQL user is not your system username (often `postgres` on Linux/Windows). For default brew installs on macOS, your system username is the correct value for `POSTGRES_USER` and should be reflected in the `DATABASE_URL`.

    *Example `DATABASE_URL` for macOS brew install:*
    `postgresql://YOUR_MACOS_USERNAME@localhost:5432/arts_marketplace?schema=public`

    *Example `DATABASE_URL` for standard PostgreSQL install:*
    `postgresql://postgres:YOUR_PASSWORD@localhost:5432/arts_marketplace?schema=public` (Update password if you set one).

### Installation and Setup

Run the following commands from the project root:

1.  **Install Dependencies**:
    ```bash
    pnpm install
    ```

2.  **Generate Prisma Client**:
    ```bash
    # Uses NODE_ENV=development by default from env/.env.development
    pnpm prisma:generate
    ```

3.  **Run Database Migrations**:
    ```bash
    # Uses NODE_ENV=development by default from env/.env.development
    pnpm prisma:migrate
    ```

4.  **Seed Database**:
    ```bash
    # Uses NODE_ENV=development by default from env/.env.development
    pnpm prisma:seed
    ```

5.  **Start Development Servers**:
    ```bash
    # Uses NODE_ENV=development implicitly via the script's use of dotenv-cli
    pnpm dev:full
    ```
    This will start the frontend and backend servers concurrently.
    - Frontend: `http://localhost:5173`
    - Backend API: `http://localhost:3000`

### Running Commands with `NODE_ENV`

Many scripts rely on the `NODE_ENV` environment variable to load the correct `.env` file (e.g., `env/.env.development`, `env/.env.test`, `env/.env.production`). While some scripts like `pnpm dev:full` set this implicitly via `dotenv-cli`, for ad-hoc commands or scripts that don't explicitly load environment files, you might need to prepend `NODE_ENV`:

```bash
# Example: Running prisma studio with development environment
NODE_ENV=development pnpm prisma:studio

# Example: Running a specific test suite with test environment
NODE_ENV=test jest --config tests/unit/jest.config.js
```

Generally, prefer using the provided `pnpm` scripts which handle environment loading.

### Full Validation Script

The `validate:full` script provides a comprehensive check of the project setup and integrity:

```bash
# Uses NODE_ENV=development for seeding/prisma commands
pnpm validate:full
```

This script performs the following actions:
1.  `pnpm clean`: Removes `dist` and `node_modules`.
2.  `pnpm install`: Installs dependencies.
3.  `pnpm prisma:reset --force`: Resets the development database.
4.  `pnpm prisma:seed`: Seeds the database.
5.  `pnpm prisma:generate`: Generates the Prisma client.
6.  `pnpm diagnose:ts`: Runs TypeScript diagnostics.
7.  `pnpm test:local`: Runs all local tests (unit, API, E2E).

Use this script to ensure your environment is correctly configured and all core components are functional.

## Running with Docker

You can run the application and tests within a Docker environment.

1.  **Deploy Locally**: Builds images and starts containers for frontend, server, and database.
    ```bash
    # Set NODE_ENV if you want to target a specific environment for the build/run
    # Defaults often assume development or production based on script definition
    pnpm docker:deploy
    ```
    This uses `docker compose -f docker/docker-compose.yml up -d`.

2.  **Run Tests in Docker**: Builds a test image and runs tests against the Dockerized application.
    ```bash
    # The script explicitly sets NODE_ENV=test
    pnpm docker:test
    ```
    This runs the test suite defined in `docker/docker-compose.yml`.

Refer to `package.json` and `docker/docker-compose.yml` for details on the specific environment variables used in these Docker commands.

## Production Build

To build the application for production:

1.  **Build Frontend**:
    ```bash
    NODE_ENV=production pnpm build:frontend
    ```
2.  **Build Server**:
    ```bash
    NODE_ENV=production pnpm build:server
    ```
3.  **Build Shared (usually included in server build)**:
    ```bash
    NODE_ENV=production pnpm build:shared
    ```

These commands compile the code and output artifacts to the `dist/` directory, optimized for production deployment. The `NODE_ENV=production` flag ensures production-specific configurations and optimizations are applied.

## CI/CD Pipelines

The project uses GitHub Actions for Continuous Integration and Continuous Deployment.

### 1. CI Pipeline (`.github/workflows/ci-cd.yml`)

-   **Name**: `GitHub CI/CD Pipeline`
-   **Triggers**: Runs on pushes and pull requests to the `main` branch.
-   **Jobs**:
    -   `test`:
        -   Runs on `ubuntu-latest`.
        -   Sets `NODE_ENV=test`.
        -   Checks out code, sets up Node.js and pnpm.
        -   Installs dependencies (`pnpm install --frozen-lockfile`).
        -   Sets up Docker Buildx.
        -   Cleans Docker environment (`pnpm docker:clean`).
        -   Builds and deploys Docker containers (`pnpm docker:deploy:rebuild`).
        -   Runs debug scripts (`scripts/docker-debug.ts`) and uploads logs.
        -   Runs tests within Docker (`pnpm docker:test`).
        -   Uploads test execution logs, Playwright reports, results, screenshots, and traces as artifacts.

### 2. Production Deployment Pipeline (`.github/workflows/production-deploy.yml`)

-   **Name**: `Production Deployment`
-   **Triggers**:
    -   Manual dispatch (`workflow_dispatch`).
    -   Completion of the `GitHub CI/CD Pipeline` workflow on the `main` branch (`workflow_run`), only if the CI pipeline succeeded.
-   **Jobs**:
    -   `deploy`:
        -   Runs on `ubuntu-latest`.
        -   Requires the `production` environment (allows for environment secrets like `FLY_API_TOKEN`).
        -   Sets `NODE_ENV=production`.
        -   Checks out code, sets up Node.js and pnpm.
        -   Installs dependencies (`pnpm install --frozen-lockfile`).
        -   Deploys the application to Fly.io using `pnpm docker:deploy:fly`.
