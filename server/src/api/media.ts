import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function uploadMedia(request: FastifyRequest, reply: FastifyReply) {
  // Mock upload endpoint
  return reply.send({
    success: true,
    message: 'Media uploaded successfully'
  });
}

export async function mediaRoutes(server: FastifyInstance) {
  server.post('/upload', uploadMedia);
}