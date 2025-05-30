#!/usr/bin/env tsx

/**
 * Test script to verify log rotation is working properly
 * This script generates a large volume of logs to trigger rotation
 */

import { logger, createChildLogger } from '../config/logger.js';

const testLogger = createChildLogger('log-rotation-test');

async function testLogRotation() {
    console.log('🧪 Testing log rotation functionality...');
    console.log('📝 Generating logs to test rotation (this may take a moment)...');

    // Generate a large number of log entries to test rotation
    const totalLogs = 1000;
    const chunkSize = 100;

    for (let i = 0; i < totalLogs; i += chunkSize) {
        // Generate a chunk of logs
        for (let j = 0; j < chunkSize && (i + j) < totalLogs; j++) {
            const logNumber = i + j + 1;

            // Mix different log levels
            if (logNumber % 10 === 0) {
                testLogger.error({ logNumber, error: 'Test error message' }, `Test error log #${logNumber}`);
            } else if (logNumber % 5 === 0) {
                testLogger.warn({ logNumber, warning: 'Test warning message' }, `Test warning log #${logNumber}`);
            } else {
                testLogger.info({
                    logNumber,
                    data: 'Test data with some content to make the log entry larger',
                    timestamp: new Date().toISOString(),
                    metadata: {
                        test: true,
                        batch: Math.floor(i / chunkSize) + 1,
                        chunk: j + 1
                    }
                }, `Test info log #${logNumber}`);
            }
        }

        // Add a small delay between chunks to simulate real-world usage
        await new Promise(resolve => setTimeout(resolve, 10));

        // Progress indicator
        if ((i + chunkSize) % 200 === 0) {
            console.log(`📊 Generated ${Math.min(i + chunkSize, totalLogs)}/${totalLogs} logs...`);
        }
    }

    testLogger.info({
        totalLogs,
        test: 'complete'
    }, `Log rotation test completed - generated ${totalLogs} log entries`);

    console.log('✅ Log rotation test completed!');
    console.log('📁 Check the ./logs directory for rotated log files');
    console.log('💡 Look for files like app.log, app.log.1, error.log, etc.');
}

// Run the test
testLogRotation().catch((error) => {
    console.error('❌ Log rotation test failed:', error);
    process.exit(1);
}); 