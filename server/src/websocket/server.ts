import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { config } from '@/shared/config';
import { redisCache } from '@/database/redis';
import { prisma } from '@/database/connection';
import { authenticateSocket } from '@/auth/socket-auth';
import { PTTService } from './services/ptt-service';
import { LocationService } from './services/location-service';
import { MessageService } from './services/message-service';
import { EmergencyService } from './services/emergency-service';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: any;
  deviceId: string;
}

export class WebSocketServer {
  private io: SocketIOServer;
  private server: any;
  private pttService: PTTService;
  private locationService: LocationService;
  private messageService: MessageService;
  private emergencyService: EmergencyService;

  constructor() {
    this.server = createServer();
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.pttService = new PTTService(this.io);
    this.locationService = new LocationService(this.io);
    this.messageService = new MessageService(this.io);
    this.emergencyService = new EmergencyService(this.io);
  }

  async start(): Promise<void> {
    // Authentication middleware
    this.io.use(authenticateSocket);

    // Connection handling
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });

    // Start server
    this.server.listen(config.WS_PORT, config.WS_HOST);
    console.log(`📡 WebSocket server listening on ${config.WS_HOST}:${config.WS_PORT}`);
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    console.log(`🔌 User ${socket.userId} connected with device ${socket.deviceId}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join user to their groups
    this.joinUserGroups(socket);

    // Set up event handlers
    this.setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Notify others of user online status
    socket.broadcast.emit('user_status', {
      userId: socket.userId,
      status: 'online',
      timestamp: new Date().toISOString()
    });
  }

  private async joinUserGroups(socket: AuthenticatedSocket): Promise<void> {
    try {
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: socket.userId },
        include: { group: true }
      });

      for (const userGroup of userGroups) {
        const roomName = `group:${userGroup.group.id}`;
        socket.join(roomName);

        // Notify group members
        socket.to(roomName).emit('group_member_online', {
          groupId: userGroup.group.id,
          userId: socket.userId,
          username: socket.user.username,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error joining user groups:', error);
    }
  }

  private setupEventHandlers(socket: AuthenticatedSocket): void {
    // PTT Events
    socket.on('ptt_request', (data) => this.pttService.handleRequest(socket, data));
    socket.on('ptt_release', (data) => this.pttService.handleRelease(socket, data));
    socket.on('ptt_audio_data', (data) => this.pttService.handleAudioData(socket, data));

    // Location Events
    socket.on('location_update', (data) => this.locationService.handleUpdate(socket, data));
    socket.on('location_request', (data) => this.locationService.handleRequest(socket, data));

    // Messaging Events
    socket.on('message_send', (data) => this.messageService.handleSend(socket, data));
    socket.on('message_typing', (data) => this.messageService.handleTyping(socket, data));

    // Emergency Events
    socket.on('emergency_sos', (data) => this.emergencyService.handleSOS(socket, data));
    socket.on('emergency_cancel', (data) => this.emergencyService.handleCancel(socket, data));

    // Status Events
    socket.on('status_update', (data) => this.handleStatusUpdate(socket, data));
    socket.on('heartbeat', () => this.handleHeartbeat(socket));

    // Configuration Events
    socket.on('config_request', () => this.handleConfigRequest(socket));
    socket.on('config_update', (data) => this.handleConfigUpdate(socket, data));
  }

  private async handleDisconnection(socket: AuthenticatedSocket): Promise<void> {
    console.log(`🔌 User ${socket.userId} disconnected`);

    try {
      // Update user status in database
      await prisma.user.update({
        where: { id: socket.userId },
        data: { status: 'OFFLINE' }
      });

      // Clear from Redis
      await redisCache.removeUserSession(socket.userId);

      // Notify others
      socket.broadcast.emit('user_status', {
        userId: socket.userId,
        status: 'offline',
        timestamp: new Date().toISOString()
      });

      // Handle active PTT sessions
      await this.pttService.handleUserDisconnection(socket);

      // Handle emergency alerts
      await this.emergencyService.handleUserDisconnection(socket);

    } catch (error) {
      console.error('Error handling disconnection:', error);
    }
  }

  private async handleStatusUpdate(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { status } = data;

      // Update database
      await prisma.user.update({
        where: { id: socket.userId },
        data: { status, updatedAt: new Date() }
      });

      // Broadcast to all connections
      this.io.emit('user_status', {
        userId: socket.userId,
        status,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update status' });
    }
  }

  private handleHeartbeat(socket: AuthenticatedSocket): void {
    // Update last seen timestamp
    socket.emit('heartbeat_ack', {
      timestamp: new Date().toISOString()
    });
  }

  private async handleConfigRequest(socket: AuthenticatedSocket): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        include: {
          emergencyProfile: true,
          userGroups: {
            include: { group: true }
          }
        }
      });

      socket.emit('config_response', {
        user,
        groups: user?.userGroups.map(ug => ug.group),
        emergencyProfile: user?.emergencyProfile
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to load configuration' });
    }
  }

  private async handleConfigUpdate(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { emergencyProfileId, notifications } = data;

      // Update user preferences
      await prisma.user.update({
        where: { id: socket.userId },
        data: {
          emergencyProfileId,
          updatedAt: new Date()
        }
      });

      socket.emit('config_updated', {
        emergencyProfileId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      socket.emit('error', { message: 'Failed to update configuration' });
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public broadcastToGroup(groupId: string, event: string, data: any): void {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        this.io.close();
        resolve();
      });
    });
  }
}