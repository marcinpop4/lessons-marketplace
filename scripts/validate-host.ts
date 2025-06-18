#!/usr/bin/env tsx

import { execa } from 'execa';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { createChildLogger } from '../config/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// --- Environment Loading ---
const nodeEnv = process.env.NODE_ENV || 'development';
const envFilePath = path.resolve(process.cwd(), 'env', `.env.${nodeEnv}`);

if (!fs.existsSync(envFilePath)) {
    console.error(`❌ Environment file not found: ${envFilePath}`);
    process.exit(1);
}
dotenv.config({ path: envFilePath });
// ---

// --- Command Line Arguments ---
const args = process.argv.slice(2);
const fastMode = args.includes('--fast');
// ---

async function runStep(
    name: string,
    command: string,
    logger: pino.Logger,
    traceId: string
) {
    logger.info({ step: name, msg: `Starting: ${name}` });
    const startTime = Date.now();
    try {
        const [file, ...args] = command.split(' ');
        const result = await execa(file, args, {
            env: {
                ...process.env,
                VALIDATION_TRACE_ID: traceId,
            },
            stdio: 'inherit',
        });
        const duration = Date.now() - startTime;
        logger.info({ step: name, duration, msg: `Completed: ${name}` });
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error({
            step: name,
            duration,
            error,
            msg: `Error: ${name}`,
        });
        throw error;
    }
}

async function main() {
    const traceId = uuidv4();
    const logger = createChildLogger('validate-host', { traceId, fastMode });

    try {
        if (!fastMode) {
            await runStep('Clean Docker Environment', 'pnpm dev:clean', logger, traceId);
            await runStep('Build Docker Images', 'pnpm dev:build', logger, traceId);
        } else {
            logger.info({ msg: 'Fast mode enabled - skipping clean and build steps' });
        }

        await runStep(
            'Start Services for Testing',
            'pnpm dev:up:test',
            logger,
            traceId
        );

        // --- Container Validation Steps ---
        logger.info({
            msg: 'Starting container validation steps...',
        });

        const execInTest = (cmd: string) =>
            `docker compose -f docker/docker-compose.yml exec -e VALIDATION_TRACE_ID=${traceId} test ${cmd}`;

        await runStep(
            'Run Database Migrations',
            execInTest('pnpm prisma:migrate:run'),
            logger,
            traceId
        );

        await runStep(
            'Seed Database',
            execInTest('pnpm prisma:generate:run'),
            logger,
            traceId
        );

        await runStep(
            'Seed Database',
            execInTest('pnpm prisma:seed:run'),
            logger,
            traceId
        );

        await runStep(
            'Run Unit Tests',
            execInTest('pnpm test:unit:run'),
            logger,
            traceId
        );

        await runStep(
            'Run API Tests',
            execInTest('pnpm test:api:run'),
            logger,
            traceId
        );

        await runStep(
            'Run E2E Tests',
            execInTest('pnpm test:e2e:run'),
            logger,
            traceId
        );

        await runStep(
            'Run Log Tests',
            execInTest('pnpm test:logs:run'),
            logger,
            traceId
        );

        const mode = fastMode ? 'fast' : 'full';
        logger.info({ msg: `Host validation (${mode} mode) completed successfully` });
    } catch (error) {
        logger.error({ msg: 'Host validation failed' });
        process.exit(1);
    }
}

main();