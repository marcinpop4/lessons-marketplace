# Arts Marketplace

A well-structured application with a React UI, API layer, database integration, and async messaging capabilities.

## Project Structure

```
arts-marketplace/
├── src/                  # Frontend React application
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components that represent routes
│   ├── layouts/          # Layout components (headers, footers, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── services/         # Frontend services
│   │   ├── database/     # Database interaction from frontend
│   │   ├── messaging/    # Messaging services (WebSockets, etc.)
│   │   └── auth/         # Authentication services
│   ├── api/              # API client for backend communication
│   │   ├── endpoints/    # API endpoint definitions
│   │   ├── utils/        # API utilities
│   │   └── middleware/   # API middleware (interceptors, etc.)
│   ├── contexts/         # React context providers
│   ├── styles/           # Global styles, themes, etc.
│   └── types/            # TypeScript type definitions
│
├── server/               # Backend API server
│   ├── controllers/      # Route controllers
│   ├── models/           # Database models
│   ├── routes/           # API route definitions
│   ├── middleware/       # Express middleware
│   ├── services/         # Backend services
│   │   ├── database/     # Database connection and operations
│   │   ├── messaging/    # Message queue services
│   │   ├── auth/         # Authentication services
│   │   └── cache/        # Caching services
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration files
│   └── tests/            # Backend tests
│
├── shared/               # Shared code between frontend and backend
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Shared utility functions
│   └── constants/        # Shared constants
│
├── public/               # Static files
│   └── assets/           # Public assets
│       ├── images/       # Image files
│       ├── icons/        # Icon files
│       └── fonts/        # Font files
│
├── package.json          # Node.js dependencies and scripts
└── ...                   # Other configuration files
```

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run lint` - Run linting
- `npm run preview` - Preview the production build

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
