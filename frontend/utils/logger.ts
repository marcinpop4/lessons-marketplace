import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

class ClientLogger {
    private endpoint: string;
    private batchSize: number;
    private flushInterval: number;
    private logQueue: any[];
    private sessionId: string;
    private userId: string | null;
    private isEnabled: boolean;

    constructor(config: {
        endpoint?: string;
        batchSize?: number;
        flushInterval?: number;
        enabled?: boolean;
    } = {}) {
        this.endpoint = config.endpoint || '/api/v1/logs';
        this.batchSize = config.batchSize || 10;
        this.flushInterval = config.flushInterval || 5000; // 5 seconds
        this.logQueue = [];
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.isEnabled = config.enabled !== false; // Enabled by default

        if (this.isEnabled) {
            // Start auto-flush
            setInterval(() => this.flush(), this.flushInterval);

            // Flush on page unload
            window.addEventListener('beforeunload', () => this.flush());

            // Capture unhandled errors
            this.setupErrorHandlers();
        }
    }

    private generateSessionId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private setupErrorHandlers(): void {
        // Capture JavaScript errors
        window.addEventListener('error', (event) => {
            this.error('JavaScript Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled Promise Rejection', {
                reason: event.reason,
                stack: event.reason?.stack
            });
        });

        // Capture fetch failures by intercepting fetch
        this.interceptFetch();
    }

    private interceptFetch(): void {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = args[0]?.toString() || '';

            try {
                const response = await originalFetch(...args);
                const duration = Date.now() - startTime;

                // Don't log our own logging requests to avoid feedback loop
                // Don't log health checks or other noisy requests
                const shouldLog = !url.includes('/api/v1/logs') &&
                    !url.includes('/health') &&
                    !url.includes('/_next/') &&
                    !url.includes('/hot-update');

                if (shouldLog) {
                    this.info('HTTP Request', {
                        url: args[0],
                        method: (args[1] as any)?.method || 'GET',
                        status: response.status,
                        duration
                    });
                }

                // Always log errors regardless of URL
                if (!response.ok) {
                    this.warn('HTTP Error Response', {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText
                    });
                }

                return response;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.error('HTTP Request Failed', {
                    url: args[0],
                    method: (args[1] as any)?.method || 'GET',
                    error: (error as Error).message,
                    duration
                });
                throw error;
            }
        };
    }

    setUser(userId: string, userData: Record<string, any> = {}): void {
        this.userId = userId;
        this.info('User Identified', { userId, ...userData });
    }

    private log(level: string, message: string, data: Record<string, any> = {}): void {
        if (!this.isEnabled) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data,
            sessionId: this.sessionId,
            userId: this.userId,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        this.logQueue.push(logEntry);

        // Immediate flush for errors
        if (level === 'error') {
            this.flush();
        } else if (this.logQueue.length >= this.batchSize) {
            this.flush();
        }
    }

    info(message: string, data?: Record<string, any>): void {
        this.log('info', message, data);
    }

    warn(message: string, data?: Record<string, any>): void {
        this.log('warn', message, data);
    }

    error(message: string, data?: Record<string, any>): void {
        this.log('error', message, data);
    }

    debug(message: string, data?: Record<string, any>): void {
        this.log('debug', message, data);
    }

    // Track user interactions
    trackClick(element: HTMLElement, data: Record<string, any> = {}): void {
        this.info('User Click', {
            element: element.tagName,
            id: element.id,
            className: element.className,
            text: element.textContent?.slice(0, 100),
            ...data
        });
    }

    // Track page views with Core Web Vitals using official library
    trackPageView = (path: string, userInfo?: { id: string; email?: string }) => {
        // Log initial page view
        this.info('Page View', {
            event: 'page_view',
            path,
            url: window.location.href,
            referrer: document.referrer,
            userInfo
        });

        // Collect Core Web Vitals using official library with callbacks
        const vitalsData: Record<string, number> = {};
        let vitalsCollected = 0;
        const expectedVitals = 5; // CLS, FCP, INP, LCP, TTFB

        const vitalsStartTime = Date.now();
        const maxWaitTime = 10000; // 10 seconds

        const handleVital = (metric: Metric) => {
            // Store the metric value
            vitalsData[metric.name.toLowerCase()] = Math.round(metric.value * (metric.name === 'CLS' ? 1000 : 1)) / (metric.name === 'CLS' ? 1000 : 1);
            vitalsCollected++;

            // Log when all vitals are collected or after a reasonable timeout
            if (vitalsCollected === expectedVitals || Date.now() - vitalsStartTime > maxWaitTime) {
                this.info('Core Web Vitals', {
                    event: 'core_web_vitals',
                    path,
                    vitals: vitalsData,
                    vitalsCollected,
                    expectedVitals,
                    isComplete: vitalsCollected === expectedVitals,
                    collectionTimeMs: Date.now() - vitalsStartTime
                });
            }
        };

        // Set up Core Web Vitals collection with callbacks
        try {
            onCLS(handleVital);
            onFCP(handleVital);
            onINP(handleVital);
            onLCP(handleVital);
            onTTFB(handleVital);
        } catch (error) {
            this.warn('Failed to initialize Core Web Vitals tracking', {
                error: error instanceof Error ? error.message : String(error)
            });
        }

        // Fallback: log partial results after timeout
        setTimeout(() => {
            if (vitalsCollected < expectedVitals && Object.keys(vitalsData).length > 0) {
                this.info('Core Web Vitals (Partial)', {
                    event: 'core_web_vitals_partial',
                    path,
                    vitals: vitalsData,
                    vitalsCollected: Object.keys(vitalsData).length,
                    expectedVitals,
                    timeoutMs: maxWaitTime,
                    note: `Only ${Object.keys(vitalsData).length} of ${expectedVitals} vitals collected within timeout`
                });
            }
        }, maxWaitTime);
    };

    // Track performance metrics
    trackPerformance(): void {
        if ('performance' in window && 'timing' in performance) {
            const timing = performance.timing;
            this.info('Page Performance', {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                fullyLoaded: timing.loadEventEnd - timing.navigationStart,
                firstByte: timing.responseStart - timing.navigationStart,
                domInteractive: timing.domInteractive - timing.navigationStart
            });
        }
    }

    private async flush(): Promise<void> {
        if (this.logQueue.length === 0) return;

        const logsToSend = [...this.logQueue];
        this.logQueue = [];

        try {
            await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logs: logsToSend })
            });
        } catch (error) {
            // Can't log to server, but shouldn't crash the app
            // Use a minimal console.error only as last resort for logger failures
            if (process.env.NODE_ENV === 'development') {
                // Only log in development to avoid noise in production
                console.error('Failed to send logs:', error);
            }
        }
    }

    // Enable/disable logging
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }
}

// Initialize and export logger
const logger = new ClientLogger({
    endpoint: import.meta.env.PROD
        ? `${import.meta.env.VITE_API_BASE_URL}/api/v1/logs`
        : '/api/v1/logs',
    enabled: import.meta.env.PROD || import.meta.env.DEV // Enable in both prod and dev
});

export default logger; 