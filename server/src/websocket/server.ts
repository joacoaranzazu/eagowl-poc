import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { config } from '../shared/config';
import { redisCache } from '../database/redis';
import { User } from '../types';

dotenv.config();

interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
  user: User;
}

const server = createServer();
const io = new SocketIOServer(server, {
  cors: {
    origin: config.cors.origin,
    methods: ["GET", "POST"]
  }
});

// Mock authenticated users storage
const authenticatedUsers = new Map<string, AuthenticatedSocket>();

io.on('connection', (socket: AuthenticatedSocket) => {
  console.log(`🔗 User connected: ${socket.id}`);

  // Authentication event
  socket.on('authenticate', async (data) => {
    try {
      const { token } = data as { token: string };
      
      // Mock authentication (reemplazar con JWT real)
      if (token && token.startsWith('mock-jwt-token')) {
        const user: User = {
          id: '1',
          username: 'demo-user',
          email: 'demo@eagowl-poc.com',
          role: 'USER',
          firstName: 'Demo',
          lastName: 'User',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Cache user in Redis
        await redisCache.set(`user:${user.id}`, JSON.stringify(user), 3600);
        
        socket.userId = user.id;
        socket.username = user.username;
        socket.user = user;
        authenticatedUsers.set(socket.id, socket);
        
        socket.emit('authenticated', { user });
        io.emit('users-list', Array.from(authenticatedUsers.values()).map(s => s.user));
        
        console.log(`✅ User authenticated: ${user.username}`);
      } else {
        socket.emit('authentication-error', { error: 'Invalid token' });
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      socket.emit('authentication-error', { error: 'Authentication failed' });
    }
  });

  // PTT events
  socket.on('ptt-press', (data) => {
    const user = socket.user;
    if (user) {
      socket.broadcast.emit('ptt-active', {
        userId: user.id,
        username: user.username,
        timestamp: new Date()
      });
      console.log(`🎤 PTT pressed by: ${user.username}`);
    }
  });

  socket.on('ptt-release', (data) => {
    const user = socket.user;
    if (user) {
      socket.broadcast.emit('ptt-inactive', {
        userId: user.id,
        username: user.username,
        timestamp: new Date()
      });
      console.log(`🎤 PTT released by: ${user.username}`);
    }
  });

  // Location events
  socket.on('location-update', async (data) => {
    const user = socket.user;
    if (user) {
      const locationData = {
        userId: user.id,
        username: user.username,
        ...data,
        timestamp: new Date()
      };
      
      // Cache location in Redis
      await redisCache.set(`location:${user.id}`, JSON.stringify(locationData), 1800);
      
      socket.broadcast.emit('location-broadcast', locationData);
      console.log(`📍 Location updated by: ${user.username}`, data);
    }
  });

  // Message events
  socket.on('send-message', async (data) => {
    const user = socket.user;
    if (user) {
      const messageData = {
        id: Math.random().toString(36).substr(2, 9),
        fromUserId: user.id,
        fromUsername: user.username,
        ...data,
        timestamp: new Date(),
        isRead: false
      };
      
      // Cache message in Redis
      await redisCache.set(`message:${messageData.id}`, JSON.stringify(messageData), 86400);
      
      socket.broadcast.emit('new-message', messageData);
      console.log(`💬 Message sent by: ${user.username}`);
    }
  });

  // Emergency events
  socket.on('emergency-alert', async (data) => {
    const user = socket.user;
    if (user) {
      const alertData = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        username: user.username,
        ...data,
        timestamp: new Date(),
        isActive: true
      };
      
      // Cache emergency in Redis
      await redisCache.set(`emergency:${alertData.id}`, JSON.stringify(alertData), 7200);
      
      socket.broadcast.emit('emergency-broadcast', alertData);
      console.log(`🚨 Emergency alert from: ${user.username}`, alertData);
    }
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    const user = socket.user;
    if (user) {
      authenticatedUsers.delete(socket.id);
      
      socket.broadcast.emit('user-disconnected', {
        userId: user.id,
        username: user.username,
        timestamp: new Date()
      });
      
      console.log(`🔌 User disconnected: ${user.username} - Reason: ${reason}`);
    }
  });
});

const PORT = config.websocket.port;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EAGOWL-POC WebSocket Server running on port ${PORT}`);
  console.log(`🔗 WebSocket endpoint: ws://localhost:${PORT}`);
});

export default io;