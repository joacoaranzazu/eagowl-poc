import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';

// Define interfaces para uso en toda la aplicación
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  isOnline: boolean;
  isActive: boolean;
  role: UserRole;
  emergencyProfileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  mediaUrl?: string;
  isRead: boolean;
  timestamp: Date;
}

export interface PTTSession {
  id: string;
  userId: string;
  groupId?: string;
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  type: 'man_down' | 'sos' | 'medical' | 'fire' | 'police';
  message: string;
  isActive: boolean;
  locationId?: string;
  timestamp: Date;
}

// Roles de usuario
export enum UserRole {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  USER = 'USER'
}

// Clases de rutas para main.ts
export class AuthRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  // Método para registrar rutas
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class UserRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class GroupRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class PTTRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class LocationRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class MessageRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class EmergencyRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

export class MediaRoutes {
  constructor() {
    // Placeholder implementation
  }
  
  registerRoutes(server: any) {
    // Implementación vacía para evitar errores de compilación
  }
}

// Error handler mejorado
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);
  
  // Manejo de errores básico para desarrollo
  if (process.env.NODE_ENV === 'development') {
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack
    });
  } else {
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
}

// Middleware de logging
export function logRequest(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${request.method} ${request.url}`);
  done();
}