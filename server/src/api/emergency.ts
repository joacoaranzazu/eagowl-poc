import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EmergencyAlert } from '../types';

export async function getEmergencyAlerts(request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    success: true,
    data: [
      {
        id: 'alert-1',
        userId: 'user-1',
        type: 'MAN_DOWN',
        severity: 'HIGH',
        title: 'Man Down Alert',
        message: 'User has not moved for 5 minutes',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St, New York, NY'
        },
        timestamp: new Date(Date.now() - 300000),
        isActive: true
      }
    ]
  });
}

export async function createEmergencyAlert(request: FastifyRequest, reply: FastifyReply) {
  const alertData = request.body as Omit<EmergencyAlert, 'id' | 'timestamp' | 'isActive'>;
  
  const newAlert = {
    id: Math.random().toString(36).substr(2, 9),
    ...alertData,
    isActive: true,
    timestamp: new Date()
  };
  
  return reply.send({
    success: true,
    data: newAlert
  });
}

export async function emergencyRoutes(server: FastifyInstance) {
  server.get('/', getEmergencyAlerts);
  server.post('/', createEmergencyAlert);
}