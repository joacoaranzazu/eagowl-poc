import { AuthenticatedSocket } from '../server';
import { redisCache } from '@/database/redis';
import { prisma } from '@/database/connection';

export class MessageService {
  private io: any;

  constructor(io: any) {
    this.io = io;
  }

  async handleSend(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const {
        recipientId,
        groupId,
        messageType = 'TEXT',
        content,
        filePath,
        fileName,
        fileSize,
        replyToId
      } = data;

      // Validate recipient
      if (!recipientId && !groupId) {
        socket.emit('error', { message: 'Recipient required' });
        return;
      }

      // Validate permissions for group messages
      if (groupId) {
        const userGroup = await prisma.userGroup.findFirst({
          where: {
            userId: socket.userId,
            groupId,
            permissions: { in: ['ADMIN', 'MODERATOR', 'MEMBER'] }
          }
        });

        if (!userGroup) {
          socket.emit('error', { message: 'Permission denied for group' });
          return;
        }
      }

      // Create message
      const message = await prisma.message.create({
        data: {
          senderId: socket.userId,
          recipientId,
          groupId,
          messageType: messageType.toUpperCase(),
          content,
          filePath,
          fileName,
          fileSize: fileSize ? BigInt(fileSize) : null,
          replyToId
        },
        include: {
          sender: {
            select: { id: true, username: true, firstName: true, lastName: true }
          },
          recipient: {
            select: { id: true, username: true, firstName: true, lastName: true }
          }
        }
      });

      const messageData = {
        id: message.id,
        sender: message.sender,
        recipient: message.recipient,
        recipientId: message.recipientId,
        groupId: message.groupId,
        messageType: message.messageType,
        content: message.content,
        filePath: message.filePath,
        fileName: message.fileName,
        fileSize: message.fileSize?.toString(),
        timestamp: message.timestamp.toISOString(),
        replyToId: message.replyToId
      };

      // Send to recipient(s)
      if (recipientId) {
        // Private message
        this.io.to(`user:${recipientId}`).emit('message_received', messageData);
      } else if (groupId) {
        // Group message
        this.io.to(`group:${groupId}`).emit('message_received', messageData);
      }

      // Send confirmation to sender
      socket.emit('message_sent', {
        ...messageData,
        delivered: true,
        timestamp: new Date().toISOString()
      });

      // Cache recent messages
      const cacheKey = recipientId 
        ? `messages:private:${recipientId}` 
        : `messages:group:${groupId}`;
      
      await redisCache.set(cacheKey, messageData, 3600);

      console.log(`💬 Message sent from ${socket.userId} to ${recipientId || `group ${groupId}`}`);

    } catch (error) {
      console.error('Message send error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handleTyping(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { recipientId, groupId, isTyping } = data;

      if (!recipientId && !groupId) {
        return;
      }

      const typingData = {
        userId: socket.userId,
        username: socket.user.username,
        isTyping,
        timestamp: new Date().toISOString()
      };

      if (recipientId) {
        // Private typing indicator
        this.io.to(`user:${recipientId}`).emit('user_typing', typingData);
      } else if (groupId) {
        // Group typing indicator
        this.io.to(`group:${groupId}`).emit('user_typing', {
          ...typingData,
          groupId
        });
      }

    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  }

  async getPrivateMessages(userId: string, otherUserId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: userId }
        ]
      },
      include: {
        sender: {
          select: { id: true, username: true, firstName: true, lastName: true }
        },
        recipient: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });

    return messages.map(message => ({
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      messageType: message.messageType,
      content: message.content,
      filePath: message.filePath,
      fileName: message.fileName,
      fileSize: message.fileSize?.toString(),
      timestamp: message.timestamp.toISOString(),
      delivered: message.delivered,
      read: message.read,
      replyToId: message.replyToId
    }));
  }

  async getGroupMessages(groupId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    const messages = await prisma.message.findMany({
      where: { groupId },
      include: {
        sender: {
          select: { id: true, username: true, firstName: true, lastName: true }
        },
        recipient: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });

    return messages.map(message => ({
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      messageType: message.messageType,
      content: message.content,
      filePath: message.filePath,
      fileName: message.fileName,
      fileSize: message.fileSize?.toString(),
      timestamp: message.timestamp.toISOString(),
      delivered: message.delivered,
      read: message.read,
      replyToId: message.replyToId
    }));
  }

  async markMessagesAsRead(userId: string, messageIds: string[]): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        recipientId: userId,
        read: false
      },
      data: { read: true }
    });

    return result.count;
  }

  async deleteMessage(messageId: string, userId: string, userRole: string): Promise<boolean> {
    const message = await prisma.message.findFirst({
      where: { id: messageId }
    });

    if (!message) {
      return false;
    }

    // Check permission to delete
    const canDelete = message.senderId === userId || userRole === 'ADMIN' || userRole === 'OPERATOR';

    if (!canDelete) {
      return false;
    }

    try {
      // Delete associated file if exists
      if (message.filePath) {
        // TODO: Implement file deletion from storage
      }

      await prisma.message.delete({
        where: { id: messageId }
      });

      return true;
    } catch (error) {
      console.error('Delete message error:', error);
      return false;
    }
  }

  async editMessage(messageId: string, userId: string, newContent: string): Promise<boolean> {
    const message = await prisma.message.findFirst({
      where: { id: messageId }
    });

    if (!message || message.senderId !== userId) {
      return false;
    }

    try {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: newContent,
          editedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('Edit message error:', error);
      return false;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.message.count({
      where: {
        recipientId: userId,
        read: false
      }
    });
  }

  async searchMessages(userId: string, query: string, limit: number = 20): Promise<any[]> {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId }
        ],
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      include: {
        sender: {
          select: { id: true, username: true, firstName: true, lastName: true }
        },
        recipient: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });

    return messages.map(message => ({
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      messageType: message.messageType,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      replyToId: message.replyToId
    }));
  }
}