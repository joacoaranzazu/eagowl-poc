// Servidor EAGOWL-POC simplificado para desarrollo y producción
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';

// Configuración básica
const PORT = parseInt(process.env.PORT || '8080');
const WS_PORT = parseInt(process.env.WS_PORT || '9998');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock database para desarrollo
const mockUsers = [
  { id: '1', username: 'admin', fullName: 'Administrator', role: 'ADMIN', isOnline: true, isActive: true }
];

// Server HTTP
const server = createServer({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Health check
server.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
});

// API test
server.get('/api/test', async (request, reply) => {
  return {
    status: 'success',
    message: 'EAGOWL-POC API is running',
    database: {
      connected: true,
      users: mockUsers.length,
      groups: 0
    },
    version: '1.0.0-simple'
  };
});

// WebSocket server
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).user = decoded;
    
    console.log(`🔗 User authenticated: ${(socket as any).user.username}`);
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`🔗 User connected: ${socket.id}`);
  
  // Join general room
  socket.join('general');
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Basic event handlers
io.on('connection', (socket) => {
  socket.on('test-message', (data) => {
    console.log(`📨 Message from ${socket.id}:`, data);
    socket.broadcast.emit('broadcast', {
      from: socket.id,
      message: data.message,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('ping', () => {
    socket.emit('pong', { 
      timestamp: new Date().toISOString() 
    });
  });
});

// Start servers
async function start() {
  try {
    await connectRedis();
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 HTTP Server running on port ${PORT}`);
      console.log(`🌐 WebSocket Server ready`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start servers:', error);
    process.exit(1);
  }
}

start();

// Export for testing
export { server, io };