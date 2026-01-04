import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Location } from '../types';

export async function getLocation(request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    success: true,
    data: {
      id: '1',
      userId: 'user-1',
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 5.0,
      timestamp: new Date(),
      address: '123 Main St, New York, NY'
    }
  });
}

export async function updateLocation(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const locationData = request.body as Omit<Location, 'id' | 'timestamp'>;
  
  return reply.send({
    success: true,
    data: {
      id,
      ...locationData,
      timestamp: new Date()
    }
  });
}

export async function locationRoutes(server: FastifyInstance) {
  server.get('/', getLocation);
  server.put('/:id', updateLocation);
}