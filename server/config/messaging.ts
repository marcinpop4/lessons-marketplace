// Messaging service configuration
// This could be for RabbitMQ, Kafka, Redis pub/sub, etc.

export interface MessagingConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  vhost?: string; // for RabbitMQ
  clientId?: string; // for Kafka
  retryAttempts: number;
  retryDelay: number; // in ms
}

// Check for required environment variables
if (!process.env.MESSAGING_HOST) {
  throw new Error("MESSAGING_HOST environment variable is required");
}

if (!process.env.MESSAGING_PORT) {
  throw new Error("MESSAGING_PORT environment variable is required");
}

if (!process.env.MESSAGING_VHOST) {
  throw new Error("MESSAGING_VHOST environment variable is required");
}

if (!process.env.MESSAGING_RETRY_ATTEMPTS) {
  throw new Error("MESSAGING_RETRY_ATTEMPTS environment variable is required");
}

if (!process.env.MESSAGING_RETRY_DELAY) {
  throw new Error("MESSAGING_RETRY_DELAY environment variable is required");
}

// Parse values after validation
const MESSAGING_HOST = process.env.MESSAGING_HOST;
const MESSAGING_PORT = parseInt(process.env.MESSAGING_PORT, 10);
const MESSAGING_VHOST = process.env.MESSAGING_VHOST;
const MESSAGING_RETRY_ATTEMPTS = parseInt(process.env.MESSAGING_RETRY_ATTEMPTS, 10);
const MESSAGING_RETRY_DELAY = parseInt(process.env.MESSAGING_RETRY_DELAY, 10);

export const messagingConfig = {
  connection: {
    host: MESSAGING_HOST,
    port: MESSAGING_PORT,
    username: process.env.MESSAGING_USER,
    password: process.env.MESSAGING_PASSWORD,
    vhost: MESSAGING_VHOST,
    retryAttempts: MESSAGING_RETRY_ATTEMPTS,
    retryDelay: MESSAGING_RETRY_DELAY,
  },
  // ... rest of the configuration
};

export const EXCHANGE_TYPES = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  HEADERS: 'headers'
};

export const QUEUE_NAMES = {
  USER_EVENTS: 'user-events',
  ORDER_PROCESSING: 'order-processing',
  NOTIFICATION: 'notification',
  PAYMENT_PROCESSING: 'payment-processing',
};

export default messagingConfig; 