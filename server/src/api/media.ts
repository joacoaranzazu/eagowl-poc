import { FastifyRequest, FastifyReply } from 'fastify';

export async function uploadMedia(request: FastifyRequest, reply: FastifyReply) {
  // Mock upload endpoint
  return reply.send({
    success: true,
    message: 'Media uploaded successfully'
  });
}