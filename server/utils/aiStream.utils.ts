import OpenAI from 'openai';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk } from 'openai/resources/chat/completions';
import chalk from 'chalk';
import { createChildLogger } from '../config/logger.js';

// Create child logger for AI stream utilities
const logger = createChildLogger('ai-stream');

// Determine if detailed logging is enabled (consider moving to a shared config/env reader)
const LOG_STREAMING_DETAILS = true;

/**
 * Options for configuring the AI stream logging and processing.
 */
interface LogAndYieldAiStreamOptions<T> {
    logContext: string; // e.g., "[Goal Stream L:lessonId]"
    systemPrompt: string;
    userPrompt: string;
    model?: string; // Optional: Defaults to gpt-3.5-turbo
    temperature?: number; // Optional: Defaults to 0.7
    aiStreamProvider: () => Promise<Stream<ChatCompletionChunk>>; // Function that creates the OpenAI stream
    chunkParser: (chunk: ChatCompletionChunk) => string | null; // Function to extract content from a chunk
    objectAssembler: (buffer: string) => { parsedObject: T | null; remainingBuffer: string }; // Function to parse a complete object T from the buffer
    objectValidator?: (obj: T) => boolean; // Optional: Function to validate the parsed object
    maxItems?: number; // Optional: Max items to yield before aborting
}

/**
 * A reusable async generator wrapper that handles logging OpenAI prompts and streaming responses,
 * while yielding processed objects. Uses chalk for colored logging.
 *
 * @param options Configuration options for the stream.
 * @returns An async generator yielding processed objects of type T.
 */
export async function* logAndYieldAiStream<T>(
    options: LogAndYieldAiStreamOptions<T>
): AsyncGenerator<T, void, unknown> {
    const {
        logContext,
        systemPrompt,
        userPrompt,
        aiStreamProvider,
        chunkParser,
        objectAssembler,
        objectValidator,
        maxItems
    } = options;

    const logPrefix = chalk.cyan(logContext);

    if (LOG_STREAMING_DETAILS) {
        logger.debug(`${logPrefix} ${chalk.blue('System Prompt:')}\n${chalk.greenBright(systemPrompt)}`);
        logger.debug(`${logPrefix} ${chalk.blue('User Prompt:')}\n${chalk.greenBright(userPrompt)}`);
    }

    logger.info(`${logPrefix} Requesting stream from OpenAI.`);
    let stream: Stream<ChatCompletionChunk>;
    try {
        stream = await aiStreamProvider();
        logger.info(`${logPrefix} ${chalk.green('OpenAI stream initiated.')}`);
    } catch (error) {
        logger.error(`${logPrefix} ${chalk.red('Failed to initiate OpenAI stream:')}`, { error });
        throw new Error(`Failed to initiate AI stream: ${error instanceof Error ? error.message : String(error)}`);
    }

    let buffer = '';
    let itemsSent = 0;

    try {
        for await (const chunk of stream) {
            const contentPiece = chunkParser(chunk) ?? '';

            if (LOG_STREAMING_DETAILS) {
                process.stdout.write(chalk.dim(contentPiece));
            }
            buffer += contentPiece;

            while (true) {
                try {
                    const { parsedObject, remainingBuffer } = objectAssembler(buffer);

                    if (parsedObject) {
                        if (!objectValidator || objectValidator(parsedObject)) {
                            if (LOG_STREAMING_DETAILS) {
                                logger.debug(`\n${logPrefix} ${chalk.magenta('Successfully parsed and yielding object:')} ${chalk.yellow(JSON.stringify(parsedObject))}`);
                            }
                            yield parsedObject;
                            itemsSent++;
                            buffer = remainingBuffer;

                            if (maxItems && itemsSent >= maxItems) {
                                if (LOG_STREAMING_DETAILS) {
                                    logger.info(`\n${logPrefix} ${chalk.yellow('Reached target count')} (${maxItems}), aborting OpenAI stream.`);
                                }
                                stream.controller.abort();
                                break;
                            }
                        } else {
                            if (LOG_STREAMING_DETAILS) {
                                logger.warn(`\n${logPrefix} ${chalk.yellow('Parsed object failed validation:')} ${chalk.gray(JSON.stringify(parsedObject))}`);
                            }
                            buffer = remainingBuffer;
                        }
                    } else {
                        buffer = remainingBuffer;
                        break;
                    }
                } catch (parseError) {
                    if (LOG_STREAMING_DETAILS) {
                        logger.warn(`\n${logPrefix} ${chalk.yellow('Warning during object assembly/parsing:')} ${chalk.red(parseError instanceof Error ? parseError.message : parseError)}. Buffer: ${chalk.gray(buffer.substring(0, 100))}...`);
                    }
                    break;
                }
            }
            if (maxItems && itemsSent >= maxItems) {
                break;
            }
        }
    } catch (streamError) {
        logger.error(`${logPrefix} ${chalk.red('Error processing AI stream:')}`, { error: streamError });
        throw streamError;
    } finally {
        if (LOG_STREAMING_DETAILS) {
            process.stdout.write('\n');
            logger.info(`${logPrefix} ${chalk.green('OpenAI stream processing finished.')} Sent ${chalk.blue(itemsSent)} items.`);
            if (buffer.trim().length > 0) {
                logger.debug(`${logPrefix} ${chalk.yellow('Remaining buffer content after loop:')} ${chalk.gray(buffer)}`);
            }
        }
    }
} 