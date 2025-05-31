import { appendFileSync } from 'fs';
import { getRouteGroup } from '../server/index.js';

// Extract all unique route groups from the source of truth
function getAvailableRouteGroups(): string[] {
    // Common HTTP methods and API paths to test
    const testRoutes = [
        'GET /api/v1/health',
        'GET /api/v1/lessons', 'POST /api/v1/lessons', 'PATCH /api/v1/lessons',
        'GET /api/v1/lesson-requests', 'POST /api/v1/lesson-requests',
        'GET /api/v1/lesson-quotes', 'POST /api/v1/lesson-quotes', 'PATCH /api/v1/lesson-quotes',
        'GET /api/v1/lesson-plans', 'POST /api/v1/lesson-plans',
        'GET /api/v1/summary', 'POST /api/v1/summary',
        'GET /api/v1/teachers', 'POST /api/v1/teachers',
        'GET /api/v1/students', 'POST /api/v1/students',
        'GET /api/v1/addresses', 'POST /api/v1/addresses',
        'POST /api/v1/auth/login', 'POST /api/v1/auth/register', 'POST /api/v1/auth/logout',
        'GET /api/v1/refresh-token', 'POST /api/v1/refresh-token',
        'POST /api/v1/logs',
        'GET /api/v1/milestones', 'POST /api/v1/milestones',
        'GET /api/v1/objectives', 'POST /api/v1/objectives',
        'GET /api/v1/teacher-lesson-rates', 'POST /api/v1/teacher-lesson-rates'
    ];

    const routeGroups = new Set<string>();

    for (const route of testRoutes) {
        const [method, url] = route.split(' ');
        const group = getRouteGroup(method, url);
        routeGroups.add(group);
    }

    return Array.from(routeGroups).sort();
}

// Get available route groups from source of truth
const availableRouteGroups = getAvailableRouteGroups();
console.log('📋 Available route groups from source of truth:', availableRouteGroups);

// Realistic API response time ranges (in milliseconds)
// Now dynamically generated based on route groups
const API_RESPONSE_RANGES: Record<string, { min: number, max: number, avg: number }> = {};

// Populate response ranges for each route group
for (const routeGroup of availableRouteGroups) {
    if (routeGroup.includes('/health')) {
        API_RESPONSE_RANGES[routeGroup] = { min: 1, max: 10, avg: 3 };
    } else if (routeGroup.includes('/auth')) {
        API_RESPONSE_RANGES[routeGroup] = { min: 150, max: 1000, avg: 400 };
    } else if (routeGroup.includes('/refresh-token')) {
        API_RESPONSE_RANGES[routeGroup] = { min: 10, max: 80, avg: 30 };
    } else if (routeGroup.includes('/logs')) {
        API_RESPONSE_RANGES[routeGroup] = { min: 5, max: 30, avg: 12 };
    } else if (routeGroup.includes('GET')) {
        // GET requests are generally faster
        API_RESPONSE_RANGES[routeGroup] = { min: 30, max: 400, avg: 120 };
    } else if (routeGroup.includes('POST')) {
        // POST requests are generally slower
        API_RESPONSE_RANGES[routeGroup] = { min: 80, max: 800, avg: 300 };
    } else if (routeGroup.includes('PATCH')) {
        // PATCH requests are moderate
        API_RESPONSE_RANGES[routeGroup] = { min: 70, max: 600, avg: 250 };
    } else {
        // Default fallback
        API_RESPONSE_RANGES[routeGroup] = { min: 50, max: 500, avg: 200 };
    }
}

console.log('⚡ Generated response time ranges:', Object.keys(API_RESPONSE_RANGES).length, 'route groups');

const HTTP_STATUSES = [200, 200, 200, 200, 200, 200, 201, 304, 400, 500]; // Weighted towards success

// Generate realistic response time with some variability
function generateResponseTime(routeGroup: string): number {
    const range = API_RESPONSE_RANGES[routeGroup];
    if (!range) return Math.floor(Math.random() * 200) + 50; // Default range

    // Use normal distribution around average with some outliers
    const random = Math.random();
    if (random < 0.8) {
        // 80% of requests are normal (around average)
        return Math.floor(Math.random() * (range.avg - range.min) + range.min);
    } else if (random < 0.95) {
        // 15% are slower (between avg and max)
        return Math.floor(Math.random() * (range.max - range.avg) + range.avg);
    } else {
        // 5% are outliers (can be very slow)
        return Math.floor(Math.random() * range.max * 2 + range.max);
    }
}

function generateApiLogEntry(): string {
    const routeGroups = Object.keys(API_RESPONSE_RANGES);
    const selectedRouteGroup = routeGroups[Math.floor(Math.random() * routeGroups.length)];

    // Extract method and basic path from route group
    const [method, basePath] = selectedRouteGroup.split(' ');

    // Sometimes add ID to the URL for more realistic patterns
    const addId = Math.random() < 0.3; // 30% chance of having an ID
    const url = addId ? `${basePath}/${Math.floor(Math.random() * 1000) + 1}` : basePath;

    const responseTime = generateResponseTime(selectedRouteGroup);
    const status = HTTP_STATUSES[Math.floor(Math.random() * HTTP_STATUSES.length)];
    const timestamp = new Date().toISOString();

    // Generate a realistic request ID
    const reqId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Use the actual getRouteGroup function to ensure consistency
    const routeGroup = getRouteGroup(method, url);

    const logEntry = {
        level: 30,
        time: timestamp,
        service: "lessons-marketplace",
        component: "http-requests",
        reqId,
        method,
        url,
        routeGroup,
        status,
        responseTime,
        userAgent: "Mozilla/5.0 (Test) AppleWebKit/537.36",
        ip: "::1",
        req: {
            headers: { host: "localhost:3000" },
            query: {},
            params: {}
        },
        res: {
            headers: { "content-type": "application/json" }
        },
        msg: `HTTP ${method} ${url} ${status} ${responseTime}ms`
    };

    return JSON.stringify(logEntry);
}

// Generate logs
console.log('Generating 1000 API request logs...');

for (let i = 0; i < 1000; i++) {
    const logEntry = generateApiLogEntry();
    appendFileSync('logs/http.log', logEntry + '\n');

    // Add some time variation between requests
    if (i % 100 === 0) {
        console.log(`Generated ${i + 1}/1000 logs...`);
    }
}

console.log('✅ Successfully generated 1000 API request logs!');
console.log('📊 You can now test the API Response Times dashboard in Grafana');
console.log('🔍 Try different combinations of:');
console.log('   - Percentiles: P50, P75, P90, P95, P99');
console.log('   - Methods: GET, POST');
console.log('   - Routes: /api/v1/lessons, /api/v1/auth/*, etc.'); 