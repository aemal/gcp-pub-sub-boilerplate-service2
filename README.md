# Subscriber Service (service2)

Part of [gcp-pub-sub-boilerplate](https://github.com/aemal/gcp-pub-sub-boilerplate)

## Purpose

This service acts as the subscriber in the Pub/Sub architecture. It listens for messages from a Google Cloud Pub/Sub subscription and provides REST API endpoints to retrieve messages and establish real-time connections for message updates.

### Features

- RESTful API using Fastify
- Google Cloud Pub/Sub subscription handling
- Real-time updates via Server-Sent Events (SSE)
- Message queue management
- Local emulator support
- CORS enabled
- Health check endpoint

### API Endpoints

#### Health Check
```bash
GET /health
```
Returns service health status.

#### Get Messages
```bash
GET /messages
```
Returns all received messages from the queue.

#### Real-time Updates
```bash
GET /events
```
Server-Sent Events endpoint for real-time message updates.

### Example Usage

Get received messages:
```bash
curl http://localhost:3001/messages
```

Monitor messages in real-time:
```bash
curl -N http://localhost:3001/events
```

Check service health:
```bash
curl http://localhost:3001/health
```

## Configuration

Environment variables:
```bash
PUBSUB_PROJECT_ID=your-project-id           # GCP project ID
PUBSUB_EMULATOR_HOST=localhost:8790         # Emulator host (for local development)
PUBSUB_TOPIC_NAME=my-topic                  # Topic name (optional)
PUBSUB_SUBSCRIPTION_NAME=my-subscription    # Subscription name (optional) 