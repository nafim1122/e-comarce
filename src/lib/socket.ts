import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let socketConnected = false;
let connectionAttempted = false;

/**
 * Get or initialize the Socket.IO client connection
 * @returns Socket instance or null if connection failed
 */
export function getSocket() {
  if (!socket && !connectionAttempted) {
    connectionAttempted = true;
    try {
      const URL = import.meta.env.VITE_API_WS || 'http://localhost:5000';
      socket = io(URL, { 
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000
      });
      
      socket.on('connect', () => {
        console.log('[Socket] Connected to server');
        socketConnected = true;
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`[Socket] Disconnected: ${reason}`);
        socketConnected = false;
      });
      
      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        socketConnected = false;
      });
      
      socket.on('error', (error) => {
        console.error('[Socket] Socket error:', error);
      });
    } catch (err) {
      console.error('[Socket] Failed to initialize socket:', err);
      socket = null;
    }
  }
  return socket;
}

/**
 * Check if socket is currently connected
 * @returns boolean indicating connection status
 */
export function isSocketConnected() {
  return socketConnected && socket?.connected === true;
}

/**
 * Manually disconnect the socket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketConnected = false;
    connectionAttempted = false;
  }
}
