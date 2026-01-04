import { FastifyRequest, FastifyReply } from 'fastify';

export async function getPTTSessions(request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    success: true,
    data: [
      {
        id: 'session-1',
        groupId: 'group-1',
        participants: ['user-1', 'user-2'],
        isActive: true,
        startTime: new Date(Date.now() - 1800000),
        audioQuality: 'HIGH'
      }
    ]
  });
}

export async function createSession(request: FastifyRequest, reply: FastifyReply) {
  const sessionData = request.body as Omit<PTTSession, 'id' | 'createdAt'>;
  
  const newSession = {
    id: Math.random().toString(36).substr(2, 9),
    ...sessionData,
    isActive: true,
    startTime: new Date()
  };
  
  return reply.send({
    success: true,
    data: newSession
  });
}

export async function endSession(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  
  return reply.send({
    success: true,
    data: {
      id,
      isActive: false,
      endTime: new Date()
    }
  });
}