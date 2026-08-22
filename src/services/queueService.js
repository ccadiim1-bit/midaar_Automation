// src/services/queueService.js
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const messageHandlerService = require('./messageHandlerService');

// Configure Redis connection. Ensure REDIS_URL is in your .env file.
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null, // Important for BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000); // Dib u xirida waxay qaadanaysaa ilaa 2 sekan
    return delay;
  },
});

connection.on('error', (error) => {
  console.error('[REDIS] Khalad xagga xiriirka ah:', error.message);
});

connection.on('reconnecting', () => {
  console.log('[REDIS] Dib ayuu isugu xirayaa...');
});

connection.on('connect', () => {
  console.log('[REDIS] Si guul leh ayuu isugu xirmay.');
});

/**
 * The main queue for processing incoming WhatsApp messages.
 */
const whatsappMessagesQueue = new Queue('whatsappMessagesQueue', { connection });

/**
 * Adds a new message job to the WhatsApp processing queue.
 * @param {object} data - The job data.
 * @param {string} data.storeId - The ID of the store.
 * @param {string} data.customerPhone - The customer's phone number.
 * @param {string} data.messageBody - The content of the message.
 */
async function addMessageToQueue(data) {
  await whatsappMessagesQueue.add('processMessage', data, {
    attempts: 3, // Retry a failed job up to 3 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with a 1-second delay, then increase exponentially
    },
  });
  // console.log(`[QUEUE] Added message for ${data.customerPhone} to the queue.`);
}

/**
 * The worker that processes jobs from the whatsappMessagesQueue.
 */
const worker = new Worker(
  'whatsappMessagesQueue',
  async (job) => {
    const { storeId, customerPhone, messageBody, imageData } = job.data;
    const logMessage = imageData ? `sawir leh (image)` : `qoraal ah (text)`;
    // console.log(`[WORKER] Processing message (${logMessage}) for ${customerPhone} from store ${storeId}`);
    await messageHandlerService.handleIncomingMessage(storeId, customerPhone, messageBody, imageData);
  },
  {
    connection,
    concurrency: 50, // Process up to 50 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // per second
    },
  }
);

// Worker event listeners for monitoring and debugging
worker.on('completed', (job) => { /* console.log(`[WORKER] Job ${job.id} completed.`); */ });
worker.on('failed', (job, err) => console.error(`[WORKER] Job ${job.id} failed: ${err.message}`));

console.log('[QUEUE] WhatsApp message worker started successfully.');

module.exports = { addMessageToQueue };