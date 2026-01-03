import { FastifyRequest, FastifyReply } from 'fastify';

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const { username, password } = request.body as { username: string; password: string };
  
  // Mock authentication (reemplazar con implementación real)
  if (username === 'admin' && password === 'admin123') {
    return reply.send({
      success: true,
      data: {
        user: {
          id: '1',
          username: 'admin',
          email: 'admin@eagowl-poc.com',
          role: 'ADMIN',
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        token: 'mock-jwt-token-' + Date.now()
      }
    });
  }
  
  return reply.status(401).send({
    success: false,
    error: 'Invalid credentials'
  });
}

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const userData = request.body as Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
  
  // Mock user creation (reemplazar con validación real)
  const newUser = {
    id: Math.random().toString(36).substr(2, 9),
    ...userData,
    role: userData.role || 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  return reply.send({
    success: true,
    data: newUser
  });
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  // Mock logout (reemplazar con implementación real)
  return reply.send({
    success: true,
    message: 'Logged out successfully'
  });
}