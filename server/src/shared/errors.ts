import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  const isDev = process.env.NODE_ENV === 'development';
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;

  if (isDev) {
    reply.status(statusCode).send({
      error: 'Request failed',
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  reply.status(statusCode).send({
    error: 'Request failed',
    message: statusCode === 500 ? 'Internal Server Error' : error.message,
  });
}
