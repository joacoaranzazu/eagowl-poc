import { createServer, type Server as HttpServer } from 'http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { config } from '../shared/config';
import { redisCache } from '../database/redis';
import { User, UserRole } from '../types';

export type AuthenticatedSocket = Socket & {
  userId: string;
  username: string;
  user: User;
};

function parseCorsOrigin(corsOrigin: string): string | string[] {
  if (corsOrigin === '*') return '*';
  const parts = corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : '*';
}

export class WebSocketServer {
  private readonly httpServer: HttpServer;
  private readonly io: SocketIOServer;
  private readonly authenticatedUsers = new Map<string, AuthenticatedSocket>();

  constructor() {
    this.httpServer = createServer();
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: parseCorsOrigin(config.CORS_ORIGIN),
        methods: ['GET', 'POST'],
      },
    });

    this.registerHandlers();
  }

  private registerHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔗 User connected: ${socket.id}`);

      socket.on('authenticate', async (data: { token?: string }) => {
        try {
          const token = data?.token;

          // Mock authentication (reemplazar con JWT real)
          if (!token || !token.startsWith('mock-jwt-token')) {
            socket.emit('authentication-error', { error: 'Invalid token' });
            return;
          }

          const user: User = {
            id: '1',
            username: 'demo-user',
            email: 'demo@eagowl-poc.com',
            role: UserRole.USER,
            firstName: 'Demo',
            lastName: 'User',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await redisCache.set(`user:${user.id}`, user, 3600);

          const authenticatedSocket = socket as AuthenticatedSocket;
          authenticatedSocket.userId = user.id;
          authenticatedSocket.username = user.username;
          authenticatedSocket.user = user;

          this.authenticatedUsers.set(socket.id, authenticatedSocket);

          authenticatedSocket.emit('authenticated', { user });
          this.io.emit('users-list', Array.from(this.authenticatedUsers.values()).map((s) => s.user));

          console.log(`✅ User authenticated: ${user.username}`);
        } catch (error) {
          console.error('❌ Authentication error:', error);
          socket.emit('authentication-error', { error: 'Authentication failed' });
        }
      });

      socket.on('ptt-press', () => {
        const authenticatedSocket = this.authenticatedUsers.get(socket.id);
        if (!authenticatedSocket) return;

        const user = authenticatedSocket.user;
        authenticatedSocket.broadcast.emit('ptt-active', {
          userId: user.id,
          username: user.username,
          timestamp: new Date(),
        });
      });

      socket.on('ptt-release', () => {
        const authenticatedSocket = this.authenticatedUsers.get(socket.id);
        if (!authenticatedSocket) return;

        const user = authenticatedSocket.user;
        authenticatedSocket.broadcast.emit('ptt-inactive', {
          userId: user.id,
          username: user.username,
          timestamp: new Date(),
        });
      });

      socket.on('location-update', async (data: any) => {
        const authenticatedSocket = this.authenticatedUsers.get(socket.id);
        if (!authenticatedSocket) return;

        const user = authenticatedSocket.user;
        const locationData = {
          userId: user.id,
          username: user.username,
          ...data,
          timestamp: new Date(),
        };

        await redisCache.set(`location:${user.id}`, locationData, 1800);
        authenticatedSocket.broadcast.emit('location-broadcast', locationData);
      });

      socket.on('send-message', async (data: any) => {
        const authenticatedSocket = this.authenticatedUsers.get(socket.id);
        if (!authenticatedSocket) return;

        const user = authenticatedSocket.user;
        const messageData = {
          id: Math.random().toString(36).substr(2, 9),
          fromUserId: user.id,
          fromUsername: user.username,
          ...data,
          timestamp: new Date(),
          isRead: false,
        };

        await redisCache.set(`message:${messageData.id}`, messageData, 86400);
        authenticatedSocket.broadcast.emit('new-message', messageData);
      });

      socket.on('emergency-alert', async (data: any) => {
        const authenticatedSocket = this.authenticatedUsers.get(socket.id);
        if (!authenticatedSocket) return;

        const user = authenticatedSocket.user;
        const alertData = {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.id,
          username: user.username,
          ...data,
          timestamp: new Date(),
          isActive: true,
        };

        await redisCache.set(`emergency:${alertData.id}`, alertData, 7200);
        authenticatedSocket.broadcast.emit('emergency-broadcast', alertData);
      });

      socket.on('disconnect', (reason: string) => {
        const authenticatedSocket = this.authenticatedUsers.get(socket.id);
        if (!authenticatedSocket) {
          console.log(`🔌 User disconnected: ${socket.id} - Reason: ${reason}`);
          return;
        }

        const user = authenticatedSocket.user;
        this.authenticatedUsers.delete(socket.id);

        authenticatedSocket.broadcast.emit('user-disconnected', {
          userId: user.id,
          username: user.username,
          timestamp: new Date(),
        });

        console.log(`🔌 User disconnected: ${user.username} - Reason: ${reason}`);
      });
    });
  }

  async start(): Promise<void> {
    const port = config.WS_PORT;
    const host = config.WS_HOST;

    await new Promise<void>((resolve) => {
      this.httpServer.listen(port, host, () => resolve());
    });

    console.log(`🚀 WebSocket server running on ${host}:${port}`);
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.io.close((err) => (err ? reject(err) : resolve()));
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer.close((err) => (err ? reject(err) : resolve()));
    });
  }

  getIO() {
    return this.io;
  }
}

export default WebSocketServer;
