# Unified Logging System

This project uses a comprehensive logging system based on **Pino** that provides structured, high-performance logging across both server-side and client-side applications.

## Overview

Our logging system consists of:

1. **Server-side logging** with Pino (replaces Morgan)
2. **Client-side logging** with custom logger
3. **Unified log aggregation** endpoint
4. **Structured JSON logging** for easy parsing and analysis

## Features

- ✅ **High Performance**: Pino is 5x faster than alternatives
- ✅ **Structured Logging**: All logs are JSON-formatted
- ✅ **Request Correlation**: Request IDs link HTTP requests to application logs
- ✅ **Client-side Error Tracking**: Automatic JavaScript error capture
- ✅ **User Behavior Tracking**: Page views, clicks, and interactions
- ✅ **Security**: Automatic redaction of sensitive data
- ✅ **Production Ready**: Designed for containerized environments

## Server-Side Logging

### Configuration

The logger is configured in `server/config/logger.ts`:

```typescript
import { logger, httpLogger, createChildLogger } from './config/logger.js';

// Basic logging
logger.info('Application started');
logger.error({ err: error }, 'Database connection failed');

// HTTP request logging (replaces Morgan)
app.use(httpLogger);

// Component-specific logging
const dbLogger = createChildLogger('database');
dbLogger.warn({ query: 'SELECT * FROM users' }, 'Slow query detected');
```

### Log Levels

- **error**: System errors, exceptions
- **warn**: Warnings, deprecated usage
- **info**: General information, user actions
- **debug**: Detailed debugging information

### Environment-Specific Behavior

**Development:**
- Pretty-printed, colorized output
- All log levels enabled
- Stack traces included

**Production:**
- JSON output for log aggregation
- Optimized for performance
- Sensitive data redacted

### Example Server Logs

```json
{
  "level": 30,
  "time": "2024-01-15T10:30:45.123Z",
  "pid": 1234,
  "hostname": "app-server",
  "reqId": "req-1642251045123",
  "component": "auth",
  "userId": "user_123",
  "msg": "User login successful"
}
```

## Client-Side Logging

### Setup

The client logger is initialized in `frontend/utils/logger.ts`:

```typescript
import logger from '@frontend/utils/logger';

// Basic logging
logger.info('User action', { action: 'click', element: 'button' });
logger.error('API call failed', { endpoint: '/api/users', status: 500 });

// User tracking
logger.setUser('user_123', { email: 'user@example.com' });

// Page tracking
logger.trackPageView('/dashboard');

// Performance tracking
logger.trackPerformance();
```

### Automatic Features

**Error Capture:**
- JavaScript errors
- Unhandled promise rejections
- Failed HTTP requests

**User Behavior:**
- Page views
- Click tracking
- Navigation patterns
- Performance metrics

### Example Client Logs

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "User Click",
  "data": {
    "element": "BUTTON",
    "id": "login-btn",
    "className": "btn btn-primary"
  },
  "sessionId": "sess_1642251045123",
  "userId": "user_123",
  "url": "https://app.example.com/login",
  "userAgent": "Mozilla/5.0...",
  "viewport": { "width": 1920, "height": 1080 }
}
```

## Log Aggregation API

### Endpoint

```
POST /api/v1/client/logs
```

### Request Format

```json
{
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:45.123Z",
      "level": "info",
      "message": "User action",
      "data": { "action": "click" },
      "sessionId": "sess_123",
      "userId": "user_456",
      "url": "https://app.example.com/page",
      "userAgent": "Mozilla/5.0...",
      "viewport": { "width": 1920, "height": 1080 }
    }
  ]
}
```

### Features

- **Batch Processing**: Send up to 100 logs per request
- **Auto-enrichment**: Server adds IP, timestamp, correlation IDs
- **Security**: Automatic filtering of sensitive data
- **Rate Limiting**: Protection against abuse

## Integration Examples

### React Component Logging

```typescript
import React, { useEffect } from 'react';
import logger from '@frontend/utils/logger';

const UserDashboard: React.FC = () => {
  useEffect(() => {
    logger.trackPageView('/dashboard');
    logger.info('Dashboard loaded', { 
      loadTime: performance.now() 
    });
  }, []);

  const handleButtonClick = (action: string) => {
    logger.info('User action', { action, component: 'dashboard' });
    // ... handle action
  };

  return (
    <div>
      <button onClick={() => handleButtonClick('export')}>
        Export Data
      </button>
    </div>
  );
};
```

### Server Controller Logging

```typescript
import { Request, Response } from 'express';
import { createChildLogger } from '../config/logger.js';

const userController = {
  async createUser(req: Request, res: Response) {
    const logger = createChildLogger('user-controller', {
      reqId: req.id,
      method: req.method,
      path: req.path
    });

    try {
      logger.info('Creating user', { 
        email: req.body.email 
      });

      const user = await userService.create(req.body);

      logger.info('User created successfully', { 
        userId: user.id 
      });

      res.status(201).json(user);
    } catch (error) {
      logger.error({ err: error }, 'Failed to create user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
```

## Security Considerations

### Automatic Redaction

The following fields are automatically redacted:
- `password`
- `token`
- `authorization`
- `cookie`
- Request/response headers with sensitive data

### Client-Side Safety

- User agent strings are truncated
- No sensitive form data is logged
- PII is hashed or truncated where possible

### Example Safe Logging

```typescript
// ❌ Don't log sensitive data
logger.info('User login', { 
  email: 'user@example.com',
  password: 'secret123'  // This would be redacted
});

// ✅ Log safely
logger.info('User login attempt', {
  emailDomain: email.split('@')[1],
  userAgent: navigator.userAgent.slice(0, 100)
});
```

## Performance

### Benchmarks

- **Pino**: ~30,000 ops/sec
- **Winston**: ~10,000 ops/sec  
- **Console.log**: ~50,000 ops/sec

### Optimizations

- Asynchronous log writing
- JSON serialization optimizations
- Automatic batching for client logs
- Background flushing

## Monitoring & Alerting

### Log Aggregation Setup

For production deployment, logs should be forwarded to a log aggregation system:

1. **Grafana Loki** (recommended for cost-effectiveness)
2. **ELK Stack** (Elasticsearch + Logstash + Kibana)
3. **Cloud providers** (AWS CloudWatch, Google Cloud Logging)

### Sample Queries

**Find all errors for a user:**
```logql
{component="server"} |= "error" | json | userId="user_123"
```

**Track user journey:**
```logql
{component="client"} | json | sessionId="sess_123" | line_format "{{.timestamp}} {{.message}}"
```

**Monitor API performance:**
```logql
{component="server"} |= "request completed" | json | status>=400
```

## Troubleshooting

### Common Issues

**Client logs not appearing:**
- Check network requests in browser DevTools
- Verify endpoint URL configuration
- Ensure CORS is properly configured

**Server logs missing context:**
- Verify request ID propagation
- Check logger child creation
- Ensure middleware order is correct

**Performance impact:**
- Adjust log levels in production
- Check batching configuration
- Monitor async queue sizes

### Debug Mode

Enable detailed logging in development:

```bash
# Server
DEBUG=true LOG_LEVEL=debug npm run dev:server

# Check logs directory
ls -la logs/
```

## Migration from Morgan

This system replaces Morgan HTTP logging with Pino's structured approach:

**Before (Morgan):**
```
GET /api/users 200 45ms - 1234 bytes
```

**After (Pino):**
```json
{
  "level": 30,
  "time": "2024-01-15T10:30:45.123Z",
  "reqId": "req-123",
  "req": {
    "method": "GET",
    "url": "/api/users"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45,
  "msg": "GET /api/users - 200"
}
```

## Future Enhancements

- [ ] **Rate limiting** for client log endpoint
- [ ] **Log sampling** for high-volume scenarios  
- [ ] **Metrics extraction** from log data
- [ ] **Real-time dashboards** with Grafana
- [ ] **Alerting rules** for error thresholds
- [ ] **Log retention policies** for cost optimization 

## Environment Variables

The logging system can be controlled via environment variables:

**Server-side:**
- `LOG_LEVEL` - Set log level: `0` (error), `1` (warn), `2` (info), `3` (debug) or string values: `error`, `warn`, `info`, `debug`
- `NODE_ENV` - Controls pretty-printing: `development` (pretty) vs `production` (JSON)

**Client-side:**
- `VITE_LOG_LEVEL` - Controls Vite's internal logging verbosity
- `DISABLE_VITE_PROXY_LOGS` - Set to `true` to disable all Vite proxy logs (useful for focusing on server logs)
- `VERBOSE_VITE_PROXY_LOGS` - Set to `true` to log all proxy requests (default: only errors)

**Examples:**
```bash
# Quiet development (only proxy errors, full server logs)
DISABLE_VITE_PROXY_LOGS=true npm run dev

# Verbose proxy logging
VERBOSE_VITE_PROXY_LOGS=true npm run dev

# Server-only logging
DISABLE_VITE_PROXY_LOGS=true LOG_LEVEL=debug npm run dev:server
```

## Development Commands

For optimal development experience with clear API logging:

```bash
# 🎯 RECOMMENDED: See all API logs clearly (proxy logs disabled)
NODE_ENV=development pnpm dev:full

# 📢 Verbose mode: See both API and proxy logs  
NODE_ENV=development pnpm dev:full:verbose

# 🔍 Debug mode: Maximum verbosity
NODE_ENV=development pnpm dev:server:debug

# 🖥️  Server only: Focus on API logs only
NODE_ENV=development pnpm dev:server
```

The `dev:full` command now uses:
- Colored prefixes to distinguish frontend vs server logs
- `LOG_LEVEL=info` to show all API requests
- `DISABLE_VITE_PROXY_LOGS=true` to focus on server API logs
- Response time tracking for performance monitoring 