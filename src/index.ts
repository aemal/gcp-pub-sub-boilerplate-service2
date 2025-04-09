import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({
  logger: true
});

// Register CORS
await app.register(cors, {
  origin: true
});

// Example endpoint that demonstrates how to use the PubSub service
app.post('/example', async (request, reply) => {
  try {
    const { message } = request.body as { message: string };
    
    if (!message) {
      return reply.code(400).send({ error: 'Message is required' });
    }

    return { 
      status: 'success',
      message: 'This is an example endpoint. In a real application, this would subscribe to the main PubSub service.',
      receivedMessage: message
    };
  } catch (error) {
    console.error('Error:', error);
    return reply.code(500).send({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', async () => {
  return { status: 'ok' };
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 3002, host: '0.0.0.0' });
    console.log('Example service 2 is running on port 3002');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start(); 