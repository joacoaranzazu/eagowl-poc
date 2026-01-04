// TypeScript types for EAGOWL-POC WebSocket
export interface AuthenticatedSocket {
  id: string;
  userId: string;
  username: string;
  user: any;
  rooms: string[];
}

// Helper functions
export function createAuthenticatedSocket(socket: any): AuthenticatedSocket {
  return {
    id: socket.id,
    userId: socket.user?.id || '',
    username: socket.user?.username || '',
    user: socket.user || null,
    rooms: []
  };
}
