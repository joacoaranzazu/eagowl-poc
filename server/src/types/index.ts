import { FastifyRequest, FastifyReply } from 'fastify';

// Tipos comunes (mantenerlos flexibles: parte del código es mock)

export enum UserRole {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  USER = 'USER',
}

export interface User {
  id: string;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string;
  role: UserRole;
  isActive: boolean;
  isOnline?: boolean;
  status?: string;
  emergencyProfileId?: string;
  avatar?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members?: string[];
  type?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  locationSource?: string;
  address?: string;
  timestamp: Date;
}

export interface Message {
  id: string;

  // Mock API fields
  fromUserId?: string;
  toUserId?: string;

  // Prisma/API-ish fields
  senderId?: string;
  recipientId?: string;

  groupId?: string;
  content: string;

  // Some modules use `type`, others `messageType`
  type?: string;
  messageType?: string;

  mediaUrl?: string;
  isRead: boolean;
  timestamp: Date;
}

export interface PTTSession {
  id: string;
  userId?: string;
  groupId?: string;
  participants?: string[];
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  audioQuality?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  type: string;
  severity?: string;
  title?: string;
  message?: string;
  notes?: string;
  location?: any;
  locationId?: string;
  priority?: number;
  isActive: boolean;
  timestamp: Date;
}

export type Emergency = EmergencyAlert;

// Error handler simple (se usa como fallback en algunos módulos)
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (process.env.NODE_ENV === 'development') {
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  reply.status(500).send({
    error: 'Internal Server Error',
    message: 'Something went wrong',
  });
}
