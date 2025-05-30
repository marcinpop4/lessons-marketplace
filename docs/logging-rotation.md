# Log Rotation System

The lessons-marketplace application uses **rotating file streams** to prevent log files from growing too large. This ensures efficient storage and easier log management.

## 🔄 **How Log Rotation Works**

The application uses the `rotating-file-stream` package to automatically:

1. **Size-based rotation**: Rotate logs when they reach 20MB
2. **Time-based rotation**: Rotate logs daily
3. **Archive management**: Keep 14 days of logs (2 weeks)
4. **Compression**: Compress old log files with gzip

## 📁 **Log Files Structure**

```
logs/
├── app.log              # Current application logs
├── app.log.1.gz         # Yesterday's logs (compressed)
├── app.log.2.gz         # 2 days ago (compressed)
├── ...
├── app.log.14.gz        # 14 days ago (oldest kept)
├── http.log             # Current HTTP request logs
├── http.log.1.gz        # Yesterday's HTTP logs
├── client.log           # Current client-side logs
├── client.log.1.gz      # Yesterday's client logs
├── error.log            # Current error logs only
└── error.log.1.gz       # Yesterday's error logs
```

## ⚙️ **Configuration**

The rotation is configured in `config/logger.ts`:

```typescript
const createRotatingStream = (filename: string) => {
    return createStream(filename, {
        interval: '1d',     // Rotate daily
        maxFiles: 14,       // Keep 2 weeks of logs
        maxSize: '20M',     // Rotate when file reaches 20MB
        path: './logs',     // Log directory
        compress: 'gzip'    // Compress old log files
    });
};
```

### **Customization Options**

You can modify the rotation behavior by changing these parameters:

- **`interval`**: How often to rotate
  - `'1d'` = daily
  - `'1h'` = hourly  
  - `'1w'` = weekly
- **`maxFiles`**: How many old files to keep (0 = unlimited)
- **`maxSize`**: Maximum file size before rotation
  - `'10M'` = 10 megabytes
  - `'100K'` = 100 kilobytes
  - `'1G'` = 1 gigabyte
- **`compress`**: Compression method for old files
  - `'gzip'` = gzip compression
  - `false` = no compression

## 🧪 **Testing Log Rotation**

To test that log rotation is working properly:

```bash
# Generate test logs to trigger rotation
pnpm run test:logs:rotation

# Check the logs directory
ls -la logs/

# You should see multiple log files and compressed archives
```

## 🔍 **Log Types**

The system creates separate rotating streams for different log types:

### **Application Logs** (`app.log`)
- All general application events
- Business logic logs
- Service layer activities
- Authentication events

### **HTTP Logs** (`http.log`)
- All incoming HTTP requests
- Response times and status codes
- Request/response bodies (in development)
- API endpoint usage

### **Client Logs** (`client.log`)
- Frontend user actions
- Client-side errors
- Performance metrics (Core Web Vitals)
- User behavior analytics

### **Error Logs** (`error.log`)
- Server errors only
- Failed requests (4xx/5xx)
- Exception stack traces
- Critical system failures

## 📊 **Monitoring & Analysis**

### **Log File Sizes**
Check current log file sizes:
```bash
ls -lah logs/
```

### **Archive Status**
See what compressed archives exist:
```bash
ls -la logs/*.gz
```

### **Real-time Monitoring**
Monitor logs in real-time:
```bash
# Watch application logs
tail -f logs/app.log

# Watch errors only  
tail -f logs/error.log

# Watch HTTP requests
tail -f logs/http.log
```

### **Search Across Archives**
Search through compressed logs:
```bash
# Search for errors in last 7 days
zgrep "ERROR" logs/app.log*.gz logs/app.log

# Find specific user activity
zgrep "userId.*abc123" logs/client.log*.gz logs/client.log
```

## 🚨 **Disk Space Management**

The rotation system automatically manages disk space by:

1. **Limiting file count**: Only keeps 14 days of logs
2. **Compressing old files**: Reduces storage by ~80%
3. **Size-based rotation**: Prevents any single file from becoming too large

### **Estimated Storage Usage**

For a moderately active application:
- **Current logs**: ~20MB max per file type
- **Daily archives**: ~4MB per file type (compressed)
- **Total for 14 days**: ~240MB for all log types

## 🔧 **Production Considerations**

### **Log Retention**
For production environments, consider:
- Increasing `maxFiles` for compliance requirements
- Setting up log shipping to external services (ELK, Grafana)
- Monitoring disk space usage

### **Performance**
- Rotation happens asynchronously and doesn't block the application
- Compression reduces I/O for old log files
- Multiple streams prevent lock contention

### **Backup Strategy**
Consider backing up logs before automatic deletion:
```bash
# Archive logs older than 10 days to external storage
find logs/ -name "*.gz" -mtime +10 -exec mv {} /backup/logs/ \;
```

## 📝 **Configuration Examples**

### **High-Traffic Environment**
```typescript
// Rotate more frequently for high-traffic sites
const createRotatingStream = (filename: string) => {
    return createStream(filename, {
        interval: '6h',     // Rotate every 6 hours
        maxFiles: 56,       // Keep 2 weeks at 6h intervals
        maxSize: '50M',     // Larger files before rotation
        compress: 'gzip'
    });
};
```

### **Development Environment**
```typescript
// Less aggressive rotation for development
const createRotatingStream = (filename: string) => {
    return createStream(filename, {
        interval: '1w',     // Weekly rotation
        maxFiles: 4,        // Keep 1 month
        maxSize: '100M',    // Larger files OK in dev
        compress: false     // No compression for easier reading
    });
};
```

### **Compliance Environment**
```typescript
// Long retention for compliance
const createRotatingStream = (filename: string) => {
    return createStream(filename, {
        interval: '1d',     // Daily rotation
        maxFiles: 90,       // Keep 3 months
        maxSize: '10M',     // Smaller files for easier handling
        compress: 'gzip'    // Compress to save space
    });
};
``` 