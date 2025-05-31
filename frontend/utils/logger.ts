import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

class ClientLogger {
    private endpoint: string;
    private batchSize: number;
    private flushInterval: number;
    private logQueue: any[];
    private sessionId: string;
    private userId: string | null;
    private isEnabled: boolean;
    private webVitalsCollected: Set<string> = new Set();
    private currentPageVitals: Record<string, number> = {};
    private currentPageGroup: string | null = null;

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
            this._initializeLogging();
        }
    }

    private generateSessionId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private _initializeLogging(): void {
        // Start auto-flush
        setInterval(() => this.flush(), this.flushInterval);

        // Flush on page unload
        window.addEventListener('beforeunload', () => this.flush());

        // Set up error handlers
        this._setupErrorHandlers();

        // Set up web-vitals tracking
        this._setupWebVitals();

        // Set up automatic click tracking
        this._setupAutoClickTracking();
    }

    private _setupErrorHandlers(): void {
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
        this._interceptFetch();
    }

    private _interceptFetch(): void {
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

    private _setupWebVitals(): void {
        const vitalsData: Record<string, number> = {};
        const expectedVitals = ['cls', 'fcp', 'inp', 'lcp', 'ttfb'];

        const handleVital = (metric: Metric) => {
            const metricName = metric.name.toLowerCase();

            // Store the metric value (only first occurrence per page)
            if (!this.webVitalsCollected.has(metricName)) {
                const value = Math.round(metric.value * (metric.name === 'CLS' ? 1000 : 1)) / (metric.name === 'CLS' ? 1000 : 1);
                vitalsData[metricName] = value;
                this.webVitalsCollected.add(metricName);

                // Store vitals data for inclusion in page view events
                this.currentPageVitals = vitalsData;

                // If this is a late-arriving vital (CLS or INP after page view), log it separately
                if ((metricName === 'cls' || metricName === 'inp') && Object.keys(this.currentPageVitals).length > 3) {
                    this.info('Core Web Vital Update', {
                        event: 'core_web_vital_update',
                        metric: metricName.toUpperCase(),
                        value: value,
                        path: window.location.pathname,
                        pageGroup: this.currentPageGroup || window.location.pathname,
                        vitalsCollected: this.webVitalsCollected.size,
                        vitals: this.currentPageVitals
                    });
                }
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
    }

    private _setupAutoClickTracking(): void {
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (!target) return;

            // Only track clicks on interactive elements
            const trackableSelectors = ['button', 'a', '[role="button"]', '[onclick]'];
            const isTrackable = trackableSelectors.some(selector => {
                return target.matches(selector) || target.closest(selector);
            });

            if (isTrackable) {
                const element = target.closest('button, a, [role="button"], [onclick]') as HTMLElement || target;

                this.info('Auto Click', {
                    element: element.tagName.toLowerCase(),
                    id: element.id || null,
                    className: element.className || null,
                    text: element.textContent?.trim().slice(0, 50) || null,
                    href: element.getAttribute('href') || null,
                    type: element.getAttribute('type') || null,
                    path: window.location.pathname
                });
            }
        }, { passive: true });
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

    // Simplified page view tracking
    trackPageView = (path: string, userInfo?: { id: string; email?: string }, pageGroup?: string) => {
        // Store the current page group for use in late-arriving vitals
        this.currentPageGroup = pageGroup || path;

        const pageViewData: Record<string, any> = {
            event: 'page_view',
            path: path,
            pageGroup: pageGroup || path, // Use pageGroup if provided, otherwise fall back to path
            url: window.location.href,
            referrer: document.referrer,
            userInfo
        };

        // Include Core Web Vitals if available
        const vitals = this.currentPageVitals;
        if (vitals && Object.keys(vitals).length > 0) {
            pageViewData.vitals = vitals;
            pageViewData.vitalsCollected = Object.keys(vitals).length;
            pageViewData.expectedVitals = 5;
        }

        this.info('Page View', pageViewData);

        // Reset web vitals collection for new page
        this.webVitalsCollected.clear();
        this.currentPageVitals = {};
    };

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

    // Keep the legacy method for compatibility but mark as deprecated
    /** @deprecated Use web-vitals integration instead */
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
    enabled: true // Always enable logging - let server-side filtering handle log levels
});

export default logger; 