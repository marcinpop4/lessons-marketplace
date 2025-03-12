# Arts Marketplace

A well-structured application with a React frontend, Express backend, PostgreSQL database integration, and async messaging capabilities.

## Project Structure

```
arts-marketplace/
├── frontend/               # Frontend React application (Vite-based)
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components that represent routes
│   ├── layouts/            # Layout components (headers, footers, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── services/           # Frontend services
│   ├── api/                # API client for backend communication
│   ├── contexts/           # React context providers
│   ├── styles/             # Global styles, themes, etc.
│   ├── types/              # TypeScript type definitions
│   ├── assets/             # Frontend assets (images, icons, etc.)
│   ├── public/             # Static files served as-is
│   ├── App.tsx             # Main App component
│   ├── App.css             # App-specific styles
│   ├── main.tsx            # Application entry point
│   ├── index.html          # HTML template
│   ├── index.css           # Global CSS
│   ├── vite.config.ts      # Vite configuration
│   ├── tsconfig.app.json   # TypeScript config for app
│   └── tsconfig.node.json  # TypeScript config for Vite config
│
├── server/                # Backend API server (Express)
│   ├── controllers/       # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # API route definitions
│   ├── middleware/        # Express middleware
│   ├── services/          # Backend services
│   ├── utils/             # Utility functions
│   ├── config/            # Configuration files
│   ├── tests/             # Backend tests
│   ├── index.ts           # Server entry point
│   ├── types.d.ts         # Type definitions
│   └── tsconfig.server.json # TypeScript config for server
│
├── shared/                # Shared code between frontend and backend
│   ├── models/            # Shared data models
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utility functions
│   └── constants/         # Shared constants
│
├── .gitignore             # Git ignore file
├── eslint.config.js       # ESLint configuration
├── package.json           # Node.js dependencies and scripts
├── pnpm-lock.yaml         # PNPM lock file
└── tsconfig.json          # Base TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- PNPM package manager
- PostgreSQL database

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/arts-marketplace.git
   cd arts-marketplace
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Create a `.env` file in the root directory with the following environment variables:
   ```
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/arts_marketplace
   
   # JWT Secret
   JWT_SECRET=your-jwt-secret
   
   # RabbitMQ (if using message queue)
   RABBITMQ_URL=amqp://localhost:5672
   ```

## Available Scripts

- `pnpm dev` - Start the frontend development server (Vite)
- `pnpm dev:server` - Start the backend development server with auto-reload (using tsx)
- `pnpm dev:full` - Start both frontend and backend in development mode concurrently
- `pnpm build` - Build the frontend for production
- `pnpm build:server` - Build the backend for production
- `pnpm build:full` - Build both frontend and backend for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint on the project
- `pnpm preview` - Preview the production build locally

## Development

The project uses:
- React 19 with TypeScript for the frontend
- Express.js with TypeScript for the backend
- PostgreSQL for database
- RabbitMQ for async messaging
- ESLint for code linting
- Vite for frontend development and bundling

## Architecture

The application follows a modular architecture with clean separation between frontend and backend. The shared directory contains code that's used by both parts of the application, ensuring type safety and consistency across the entire codebase.

## Deployment

Build the application for production:
```
pnpm build:full
```

Then start the production server:
```
pnpm start
```
