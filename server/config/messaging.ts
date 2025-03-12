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

// Load configuration from environment variables
export const config: MessagingConfig = {
  host: process.env.MESSAGING_HOST || 'localhost',
  port: parseInt(process.env.MESSAGING_PORT || '5672', 10), // Default RabbitMQ port
  username: process.env.MESSAGING_USER,
  password: process.env.MESSAGING_PASSWORD,
  vhost: process.env.MESSAGING_VHOST || '/',
  retryAttempts: parseInt(process.env.MESSAGING_RETRY_ATTEMPTS || '5', 10),
  retryDelay: parseInt(process.env.MESSAGING_RETRY_DELAY || '1000', 10),
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

export default config; 