import { AuthenticatedSocket } from '../server';
import { redisCache } from '../../database/redis';
import { prisma } from '../../database/connection';

export class PTTService {
  private io: any;
  private activeSessions: Map<string, any> = new Map();

  constructor(io: any) {
    this.io = io;
  }

  async handleRequest(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { groupId, sessionType = 'VOICE' } = data;

      // Validate user has permission for group
      const userGroup = await prisma.userGroup.findFirst({
        where: {
          userId: socket.userId,
          groupId,
          permissions: { in: ['ADMIN', 'MODERATOR', 'MEMBER'] }
        }
      });

      if (!userGroup) {
        socket.emit('ptt_denied', { reason: 'Permission denied' });
        return;
      }

      // Check if PTT session is already active for the group
      const activeSession = await this.getActivePTTSession(groupId);
      if (activeSession) {
        socket.emit('ptt_denied', { reason: 'Group busy' });
        return;
      }

      // Create PTT session
      const session = await prisma.pTTSession.create({
        data: {
          groupId,
          callerId: socket.userId,
          startTime: new Date(),
          sessionType: sessionType.toUpperCase() as any,
          isActive: true,
          participants: 1
        } as any
      });

      // Cache active session
      this.activeSessions.set(groupId, {
        sessionId: session.id,
        callerId: socket.userId,
        startTime: session.startTime,
        sessionType
      });

      await redisCache.setPTTSession(`group:${groupId}`, this.activeSessions.get(groupId), 3600);

      // Notify all group members
      this.io.to(`group:${groupId}`).emit('ptt_started', {
        sessionId: session.id,
        groupId,
        callerId: socket.userId,
        callerName: socket.user.username,
        sessionType,
        timestamp: session.startTime
      });

      // Grant floor to caller
      socket.emit('ptt_granted', {
        sessionId: session.id,
        groupId,
        timestamp: new Date().toISOString()
      });

      // Update user status
      await prisma.user.update({
        where: { id: socket.userId },
        data: { status: 'IN_PTT_CALL' }
      });

      console.log(`🎤 PTT session started: ${session.id} by user ${socket.userId} in group ${groupId}`);

    } catch (error) {
      console.error('PTT request error:', error);
      socket.emit('ptt_denied', { reason: 'Server error' });
    }
  }

  async handleRelease(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { sessionId } = data;

      const session = await prisma.pTTSession.findFirst({
        where: {
          id: sessionId,
          callerId: socket.userId,
          isActive: true
        }
      });

      if (!session) {
        socket.emit('error', { message: 'Session not found' });
        return;
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      // Update session
      await prisma.pTTSession.update({
        where: { id: sessionId },
        data: {
          endTime,
          duration,
          isActive: false
        }
      });

      // Clear from active sessions
      this.activeSessions.delete(session.groupId);
      await redisCache.removePTTSession(`group:${session.groupId}`);

      // Notify group members
      this.io.to(`group:${session.groupId}`).emit('ptt_ended', {
        sessionId,
        groupId: session.groupId,
        duration,
        timestamp: endTime.toISOString()
      });

      // Update user status
      await prisma.user.update({
        where: { id: socket.userId },
        data: { status: 'ONLINE' }
      });

      console.log(`🔇 PTT session ended: ${sessionId}, duration: ${duration}s`);

    } catch (error) {
      console.error('PTT release error:', error);
      socket.emit('error', { message: 'Failed to release PTT session' });
    }
  }

  async handleAudioData(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { sessionId, audioData, sequenceNumber } = data;

      // Verify session ownership
      const session = await prisma.pTTSession.findFirst({
        where: {
          id: sessionId,
          callerId: socket.userId,
          isActive: true
        }
      });

      if (!session) {
        socket.emit('error', { message: 'Invalid session' });
        return;
      }

      // Broadcast audio to group members (excluding sender)
      socket.to(`group:${session.groupId}`).emit('ptt_audio', {
        sessionId,
        audioData,
        sequenceNumber,
        senderId: socket.userId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Audio data handling error:', error);
    }
  }

  private async getActivePTTSession(groupId: string): Promise<any> {
    // Check memory first
    if (this.activeSessions.has(groupId)) {
      return this.activeSessions.get(groupId);
    }

    // Check Redis
    const cachedSession = await redisCache.getPTTSession(`group:${groupId}`);
    if (cachedSession) {
      this.activeSessions.set(groupId, cachedSession);
      return cachedSession;
    }

    // Check database
    const activeSession = await prisma.pTTSession.findFirst({
      where: {
        groupId,
        isActive: true
      }
    });

    if (activeSession) {
      const sessionData = {
        sessionId: activeSession.id,
        callerId: activeSession.callerId,
        startTime: activeSession.startTime,
        sessionType: activeSession.sessionType
      };
      this.activeSessions.set(groupId, sessionData);
      await redisCache.setPTTSession(`group:${groupId}`, sessionData, 3600);
      return sessionData;
    }

    return null;
  }

  async handleUserDisconnection(socket: AuthenticatedSocket): Promise<void> {
    try {
      // Find and end any active PTT sessions for this user
      const activeSessions = await prisma.pTTSession.findMany({
        where: {
          callerId: socket.userId,
          isActive: true
        }
      });

      for (const session of activeSessions) {
        // Update session
        await prisma.pTTSession.update({
          where: { id: session.id },
          data: {
            endTime: new Date(),
            isActive: false
          }
        });

        // Clear from active sessions
        this.activeSessions.delete(session.groupId);
        await redisCache.removePTTSession(`group:${session.groupId}`);

        // Notify group members
        this.io.to(`group:${session.groupId}`).emit('ptt_force_ended', {
          sessionId: session.id,
          reason: 'user_disconnected',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Error handling PTT user disconnection:', error);
    }
  }

  async getPTTHistory(groupId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const sessions = await prisma.pTTSession.findMany({
      where: { groupId },
      include: {
        caller: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset
    });

    return sessions.map(session => ({
      id: session.id,
      caller: session.caller,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      sessionType: session.sessionType,
      recordingPath: session.recordingPath,
      quality: session.quality
    }));
  }
}