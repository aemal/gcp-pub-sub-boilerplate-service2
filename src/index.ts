import fastify from 'fastify';
import cors from '@fastify/cors';
import { PubSub } from '@google-cloud/pubsub';
import { join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const app = fastify({
  logger: true
});

// Register CORS
await app.register(cors, {
  origin: true
});

// Serve static files
await app.register(import('@fastify/static'), {
  root: join(__dirname, '../public'),
  prefix: '/'
});

// Initialize PubSub with emulator support
const emulatorHost = process.env.PUBSUB_EMULATOR_HOST;
const apiEndpoint = emulatorHost ? `http://${emulatorHost}` : undefined;
const projectId = process.env.PUBSUB_PROJECT_ID || 'gcp-pubsub-456020';

const pubsub = new PubSub({
  projectId,
  apiEndpoint
});

console.log('PubSub initialized with:', {
  projectId,
  apiEndpoint
});

// Load Pub/Sub configuration
let pubsubConfig;
try {
  const configPath = path.resolve(process.cwd(), '../config/pubsub-config.json');
  const configData = fs.readFileSync(configPath, 'utf8');
  pubsubConfig = JSON.parse(configData);
  console.log('Loaded Pub/Sub configuration:', pubsubConfig);
} catch (error) {
  console.error('Error loading Pub/Sub configuration:', error);
  pubsubConfig = { topics: [] };
}

// Configuration
const TOPIC_NAME = 'my-topic';
const SUBSCRIPTION_NAME = 'my-subscription';

// Store messages in memory
const messageQueue: any[] = [];

// Store SSE clients
const sseClients = new Set<any>();

// Ensure subscription exists and set up listener
async function setupSubscription() {
  // First ensure topic exists
  const topic = pubsub.topic(TOPIC_NAME);
  const [topicExists] = await topic.exists();
  if (!topicExists) {
    console.log(`Topic ${TOPIC_NAME} does not exist, creating it...`);
    await pubsub.createTopic(TOPIC_NAME);
    console.log(`Topic ${TOPIC_NAME} created successfully`);
  }

  // Then ensure subscription exists
  const subscription = pubsub.subscription(SUBSCRIPTION_NAME);
  const [exists] = await subscription.exists();
  if (!exists) {
    console.log(`Subscription ${SUBSCRIPTION_NAME} does not exist, creating it...`);
    await topic.createSubscription(SUBSCRIPTION_NAME);
    console.log(`Subscription ${SUBSCRIPTION_NAME} created successfully`);
  }

  // Set up message handler
  subscription.on('message', (message) => {
    console.log('Received message:', message.data.toString());
    const messageData = {
      id: message.id,
      data: JSON.parse(message.data.toString()),
      publishTime: message.publishTime
    };
    messageQueue.push(messageData);
    message.ack();

    // Notify all SSE clients
    sseClients.forEach(client => {
      client.write(`data: ${JSON.stringify(messageQueue)}\n\n`);
    });
  });

  subscription.on('error', (error) => {
    console.error('Subscription error:', error);
  });

  console.log('Subscription listener set up successfully');
}

// Health check endpoint
app.get('/health', async () => {
  return { status: 'ok' };
});

// Get messages endpoint
app.get('/messages', async (request, reply) => {
  try {
    return messageQueue;
  } catch (error) {
    console.error('Error getting messages:', error);
    return reply.code(500).send({ error: 'Failed to get messages' });
  }
});

// SSE endpoint for real-time updates
app.get('/events', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial data
  reply.raw.write(`data: ${JSON.stringify(messageQueue)}\n\n`);

  // Add client to the set
  sseClients.add(reply.raw);

  // Remove client when connection closes
  request.raw.on('close', () => {
    sseClients.delete(reply.raw);
  });
});

// Push notification endpoint for push notifications
app.post('/notifications', async (request, reply) => {
  try {
    console.log('Received push notification in service2:');
    console.log('Headers:', request.headers);
    console.log('Body:', request.body);
    
    // In a real application, you would validate the Pub/Sub token here
    // For local development with the emulator, we'll just log the message
    
    // Add the message to our queue for display
    const messageData = {
      id: 'push-' + Date.now(),
      data: request.body,
      publishTime: new Date().toISOString()
    };
    messageQueue.push(messageData);
    
    // Notify all SSE clients
    sseClients.forEach(client => {
      client.write(`data: ${JSON.stringify(messageQueue)}\n\n`);
    });
    
    // Return 200 OK to acknowledge the message
    return reply.code(200).send({ status: 'ok' });
  } catch (error) {
    console.error('Error processing push notification:', error);
    return reply.code(500).send({ error: 'Failed to process notification' });
  }
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Subscriber service is running on port 3001');
    console.log('Using Pub/Sub Emulator:', !!process.env.PUBSUB_EMULATOR_HOST);
    
    // Set up subscription listener
    await setupSubscription();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start(); 