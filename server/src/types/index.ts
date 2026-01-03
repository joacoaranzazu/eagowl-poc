import dotenv from 'dotenv';

dotenv.config();

interface User {
  id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'USER' | 'GUEST';
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

interface PTTSession {
  id: string;
  groupId: string;
  participants: string[];
  isActive: boolean;
  startTime: Date;
  endTime?: Date;
  audioQuality: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Location {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  address?: string;
}

interface Message {
  id: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';
  timestamp: Date;
  isRead: boolean;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
  };
}

interface EmergencyAlert {
  id: string;
  userId: string;
  type: 'SOS' | 'MAN_DOWN' | 'GEOFENCE' | 'PRIORITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
  isActive: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export type { User, Group, PTTSession, Location, Message, EmergencyAlert };