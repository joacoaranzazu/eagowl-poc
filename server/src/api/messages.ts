import { FastifyRequest, FastifyReply } from 'fastify';

export async function getMessages(request: FastifyRequest, reply: FastifyReply) {
  return reply.send({
    success: true,
    data: [
      {
        id: 'msg-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: 'Hello, this is a test message',
        type: 'TEXT',
        timestamp: new Date(Date.now() - 86400000),
        isRead: true
      },
      {
        id: 'msg-2',
        fromUserId: 'user-2',
        groupId: 'group-1',
        content: 'Group message test',
        type: 'TEXT',
        timestamp: new Date(Date.now() - 3600000),
        isRead: false
      }
    ]
  });
}

export async function sendMessage(request: FastifyRequest, reply: FastifyReply) {
  const messageData = request.body as Omit<Message, 'id' | 'timestamp' | 'isRead'>;
  
  const newMessage = {
    id: Math.random().toString(36).substr(2, 9),
    ...messageData,
    timestamp: new Date()
  };
  
  return reply.send({
    success: true,
    data: newMessage
  });
}