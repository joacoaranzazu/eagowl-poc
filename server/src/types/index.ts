import dotenv from 'dotenv';

dotenv.config();

// Simplified types for immediate functionality
interface BaseUser {
  id: string;
  username: string;
  email?: string;
  role?: 'ADMIN' | 'OPERATOR' | 'USER' | 'GUEST';
  firstName?: string;
  lastName?: string;
  isActive: boolean;
}

interface BaseGroup {
  id: string;
  name: string;
  description?: string;
  members?: string[];
  createdBy?: string;
  isActive: boolean;
}

interface BasePTTSession {
  id: string;
  groupId: string;
  participants?: string[];
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface BaseLocation {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  address?: string;
}

interface BaseMessage {
  id: string;
  fromUserId: string;
  toUserId?: string;
  groupId?: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';
  timestamp: Date;
  isRead: boolean;
}

interface BaseEmergency {
  id: string;
  userId: string;
  type: 'SOS' | 'MAN_DOWN' | 'GEOFENCE' | 'PRIORITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp: Date;
  isActive: boolean;
}

export type { 
  User: BaseUser, 
  Group: BaseGroup, 
  PTTSession: BasePTTSession, 
  Location: BaseLocation, 
  Message: BaseMessage, 
  Emergency: BaseEmergency 
};