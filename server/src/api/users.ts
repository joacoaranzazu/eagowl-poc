import { FastifyRequest, FastifyReply } from 'fastify';
import { User, Group, PTTSession, Location, Message, Emergency } from '../types';

// Mock database storage (to be replaced with real implementation)
let users: User[] = [];
let groups: Group[] = [];
let sessions: PTTSession[] = [];
let locations: Location[] = [];
let messages: Message[] = [];
let emergencies: Emergency[] = [];

export async function getUsers(reply: FastifyReply) {
  return reply.send({ 
    success: true, 
    data: users.filter(u => u.isActive) 
  });
}

export async function getUserById(id: string, reply: FastifyReply) {
  const user = users.find(u => u.id === id);
  if (!user) {
    return reply.status(404).send({ 
      success: false, 
      error: 'User not found' 
    });
  }
  return reply.send({ 
    success: true, 
    data: user 
  });
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, reply: FastifyReply) {
  const newUser: User = {
    id: Math.random().toString(36).substr(2, 9),
    ...userData,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.push(newUser);
  return reply.send({ 
    success: true, 
    data: newUser 
  });
}

export async function updateUser(id: string, updates: Partial<User>, reply: FastifyReply) {
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return reply.status(404).send({ 
      success: false, 
      error: 'User not found' 
    });
  }
  
  const updatedUser = { ...users[userIndex], ...updates, updatedAt: new Date() };
  users[userIndex] = updatedUser;
  return reply.send({ 
    success: true, 
    data: updatedUser 
  });
}

export async function getGroups(reply: FastifyReply) {
  return reply.send({ 
    success: true, 
    data: groups.filter(g => g.isActive) 
  });
}

export async function createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>, reply: FastifyReply) {
  const newGroup: Group = {
    id: Math.random().toString(36).substr(2, 9),
    ...groupData,
    members: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  groups.push(newGroup);
  return reply.send({ 
    success: true, 
    data: newGroup 
  });
}

export async function getPTTSessions(reply: FastifyReply) {
  return reply.send({ 
    success: true, 
    data: sessions.filter(s => s.isActive) 
  });
}

export async function createSession(sessionData: Omit<PTTSession, 'id' | 'createdAt'>, reply: FastifyReply) {
  const newSession: PTTSession = {
    id: Math.random().toString(36).substr(2, 9),
    ...sessionData,
    isActive: true,
    startTime: new Date()
  };
  
  sessions.push(newSession);
  return reply.send({ 
    success: true, 
    data: newSession 
  });
}

export async function getLocations(reply: FastifyReply) {
  return reply.send({ 
    success: true, 
    data: locations 
  });
}

export async function updateLocation(userId: string, locationData: Omit<Location, 'id' | 'timestamp'>, reply: FastifyReply) {
  const newLocation: Location = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    ...locationData,
    timestamp: new Date()
  };
  
  locations.push(newLocation);
  return reply.send({ 
    success: true, 
    data: newLocation 
  });
}

export async function getMessages(reply: FastifyReply) {
  return reply.send({ 
    success: true, 
    data: messages 
  });
}

export async function sendMessage(messageData: Omit<Message, 'id' | 'timestamp' | 'isRead'>, reply: FastifyReply) {
  const newMessage: Message = {
    id: Math.random().toString(36).substr(2, 9),
    ...messageData,
    timestamp: new Date(),
    isRead: false
  };
  
  messages.push(newMessage);
  return reply.send({ 
    success: true, 
    data: newMessage 
  });
}

export async function getEmergencyAlerts(reply: FastifyReply) {
  return reply.send({ 
    success: true, 
    data: emergencies.filter(e => e.isActive) 
  });
}

export async function createEmergencyAlert(alertData: Omit<EmergencyAlert, 'id' | 'timestamp' | 'isActive'>, reply: FastifyReply) {
  const newAlert: EmergencyAlert = {
    id: Math.random().toString(36).substr(2, 9),
    ...alertData,
    isActive: true,
    timestamp: new Date()
  };
  
  emergencies.push(newAlert);
  return reply.send({ 
    success: true, 
    data: newAlert 
  });
}