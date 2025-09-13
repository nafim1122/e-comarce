import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
export function getSocket() {
  if (!socket) {
    const URL = import.meta.env.VITE_API_WS || 'http://localhost:5000';
    socket = io(URL, { withCredentials: true });
  }
  return socket;
}
