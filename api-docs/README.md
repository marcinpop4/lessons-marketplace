# API Documentation

This directory contains the API documentation for the Lessons Marketplace application using Swagger/OpenAPI.

## Files

- `swagger.yaml`: The OpenAPI specification file that defines all API endpoints, request/response schemas, and security requirements.
- `swagger-ui.html`: HTML file that renders the Swagger UI interface to visualize and interact with the API documentation.
- `serve-swagger.ts`: TypeScript server that serves the Swagger UI.

## Usage

To view the API documentation, run:

```bash
pnpm swagger:server
```

This will start a server on port 3030 and automatically open your browser to view the documentation.

## Updating Documentation

When you add or modify API endpoints, you should update the `swagger.yaml` file to reflect those changes. The Swagger UI will automatically display the updated documentation the next time you run the server.

## Best Practices

1. Keep the API documentation up-to-date with the actual implementation
2. Use descriptive summaries and detailed descriptions for each endpoint
3. Include proper example values and response codes
4. Document all possible error responses
5. Group related endpoints under appropriate tags
6. Include authentication requirements for protected endpoints 