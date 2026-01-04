import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { config } from './shared/config';
import { connectDatabase } from './database/connection';
import { connectRedis } from './database/redis';
import { WebSocketServer } from './websocket/server';
import { authRoutes } from './api/auth';
import { userRoutes } from './api/users';
import { groupRoutes } from './api/groups';
import { pttRoutes } from './api/ptt';
import { locationRoutes } from './api/location';
import { messageRoutes } from './api/messages';
import { emergencyRoutes } from './api/emergency';
import { mediaRoutes } from './api/media';
import { errorHandler } from './shared/errors';

async function createServer() {
  const server = fastify({
    logger: {
      level: config.LOG_LEVEL,
      format: config.LOG_FORMAT
    }
  });

  // Register plugins
  await server.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true
  });

  await server.register(jwt, {
    secret: config.JWT_SECRET
  });

  await server.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB
    }
  });

  // Error handling
  server.setErrorHandler(errorHandler);

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(groupRoutes, { prefix: '/api/groups' });
  await server.register(pttRoutes, { prefix: '/api/ptt' });
  await server.register(locationRoutes, { prefix: '/api/location' });
  await server.register(messageRoutes, { prefix: '/api/messages' });
  await server.register(emergencyRoutes, { prefix: '/api/emergency' });
  await server.register(mediaRoutes, { prefix: '/api/media' });

  return server;
}

async function start() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Connect to Redis
    await connectRedis();

    // Create HTTP server
    const server = await createServer();

    // Create WebSocket server
    const wsServer = new WebSocketServer();
    await wsServer.start();

    // Start HTTP server
    await server.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });

    console.log(`🚀 EAGOWL-POC Server started on ${config.HOST}:${config.PORT}`);
    console.log(`📡 WebSocket server started on port ${config.WS_PORT}`);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

start();