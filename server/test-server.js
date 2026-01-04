const fastify = require('fastify');
const { PrismaClient } = require('@prisma/client');

const app = fastify({ logger: true });
const prisma = new PrismaClient();

// Health check endpoint
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Basic API test endpoint
app.get('/api/test', async (request, reply) => {
  try {
    // Test database connection
    const userCount = await prisma.user.count();
    const groupCount = await prisma.group.count();
    
    return {
      status: 'success',
      message: 'EAGOWL-POC API is running',
      database: {
        connected: true,
        users: userCount,
        groups: groupCount
      },
      version: '1.0.0'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    };
  }
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: 8080, host: '0.0.0.0' });
    console.log('🚀 EAGOWL-POC Test API Server running on http://localhost:8080');
  } catch (err) {
    console.error(err);
    process.exit(1);
  };
};

start();