import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

// Realistic Core Web Vitals ranges based on real-world data
const CWV_RANGES = {
    ttfb: { min: 50, max: 800, good: 200, poor: 600 },
    fcp: { min: 200, max: 4000, good: 1800, poor: 3000 },
    lcp: { min: 400, max: 6000, good: 2500, poor: 4000 },
    cls: { min: 0, max: 0.5, good: 0.1, poor: 0.25 },
    inp: { min: 50, max: 1000, good: 200, poor: 500 }
};

const PAGE_GROUPS = [
    '/student/lesson-request',
    '/student/teacher-quotes/{id}',
    '/student/lesson-confirmation/{id}',
    '/teacher/lessons/{id}',
    '/teacher/lessons/{id}/create-plan',
    '/teacher/dashboard',
    '/student/dashboard',
    '/', // home page
];

// Generate random value with realistic distribution (weighted towards good values)
function generateMetricValue(metric: keyof typeof CWV_RANGES): number {
    const range = CWV_RANGES[metric];
    const random = Math.random();

    // 60% good values, 30% needs improvement, 10% poor
    if (random < 0.6) {
        // Good range
        return Math.round(range.min + Math.random() * (range.good - range.min));
    } else if (random < 0.9) {
        // Needs improvement
        return Math.round(range.good + Math.random() * (range.poor - range.good));
    } else {
        // Poor
        return Math.round(range.poor + Math.random() * (range.max - range.poor));
    }
}

function generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateTimestamp(baseTime: Date, offsetMinutes: number): string {
    const timestamp = new Date(baseTime.getTime() + offsetMinutes * 60 * 1000);
    return timestamp.toISOString();
}

function generatePageViewLog(timestamp: string, sessionId: string, pageGroup: string): string {
    const vitals = {
        ttfb: generateMetricValue('ttfb'),
        fcp: generateMetricValue('fcp'),
        lcp: generateMetricValue('lcp'),
        cls: Math.round(generateMetricValue('cls') * 1000) / 1000, // Round to 3 decimal places
        inp: generateMetricValue('inp')
    };

    const log = {
        timestamp,
        level: "info",
        msg: "Page View",
        sessionId,
        userId: "anonymous",
        event: "page_view",
        path: pageGroup.includes('{id}') ? pageGroup.replace('{id}', Math.random().toString(36).substr(2, 8)) : pageGroup,
        pageGroup,
        vitals,
        vitalsCollected: 5,
        expectedVitals: 5
    };

    return JSON.stringify(log);
}

// Generate logs
const NUM_LOGS = 2000;
const baseTime = new Date();
const logs: string[] = [];

console.log(`Generating ${NUM_LOGS} Core Web Vitals logs...`);

for (let i = 0; i < NUM_LOGS; i++) {
    const sessionId = generateSessionId();
    const pageGroup = PAGE_GROUPS[Math.floor(Math.random() * PAGE_GROUPS.length)];
    const timestamp = generateTimestamp(baseTime, Math.random() * -60); // Spread over last hour

    const log = generatePageViewLog(timestamp, sessionId, pageGroup);
    logs.push(log);

    if (i % 200 === 0) {
        console.log(`Generated ${i + 1}/${NUM_LOGS} logs...`);
    }
}

// Write to client.log
const logPath = join(process.cwd(), 'logs', 'client.log');
const logContent = logs.join('\n') + '\n';

try {
    appendFileSync(logPath, logContent);
    console.log(`✅ Successfully appended ${NUM_LOGS} logs to ${logPath}`);

    // Show some sample generated values for each metric
    console.log('\n📊 Sample generated values:');
    for (const metric of Object.keys(CWV_RANGES)) {
        const values = logs.slice(0, 10).map(log => {
            const parsed = JSON.parse(log);
            return parsed.vitals[metric];
        });
        console.log(`${metric.toUpperCase()}: ${values.join(', ')}`);
    }

} catch (error) {
    console.error('❌ Error writing to log file:', error);
    console.log('\n📋 Generated logs (paste these into client.log):');
    console.log(logContent);
} 