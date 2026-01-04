// Servidor EAGOWL-POC simplificado (solo pruebas/smoke-test)
// - No requiere Postgres/Prisma
// - No requiere Redis
// - Expone /health y /api/test

import fastify from 'fastify';
import { Server as SocketIOServer } from 'socket.io';

const PORT = parseInt(process.env.PORT || '8080');

const mockUsers = [
  { id: '1', username: 'admin', fullName: 'Administrator', role: 'ADMIN', isOnline: true, isActive: true },
];

async function start() {
  const app = fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  });

  app.get('/api/test', async () => {
    return {
      status: 'success',
      message: 'EAGOWL-POC SIMPLE API is running',
      database: {
        connected: false,
        users: mockUsers.length,
        groups: 0,
      },
      version: '1.0.0-simple',
    };
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });

  // Socket.IO on the same HTTP server (for quick client tests)
  const io = new SocketIOServer(app.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.join('general');

    socket.on('test-message', (data) => {
      socket.broadcast.emit('broadcast', {
        from: socket.id,
        message: data?.message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });
  });

  console.log(`🚀 SIMPLE server running on port ${PORT}`);
}

start().catch((error) => {
  console.error('❌ Failed to start SIMPLE server:', error);
  process.exit(1);
});
