// TypeScript types for EAGOWL-POC WebSocket
import type { Socket } from "socket.io";

export interface AuthenticatedSocket extends Socket {
  userId: string;
  username: string;
  user: any;
}

// Helper function
export function asAuthenticatedSocket(socket: Socket): AuthenticatedSocket {
  const s = socket as AuthenticatedSocket;
  s.userId = (socket as any).user?.id ?? "";
  s.username = (socket as any).user?.username ?? "";
  s.user = (socket as any).user ?? null;
  return s;
}
