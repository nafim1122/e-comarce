import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

/**
 * Initialize Socket.IO server with the HTTP server
 * @param server HTTP server instance
 * @returns Socket.IO server instance
 */
export function initializeSocketIO(server: http.Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? false 
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true
    },
    pingTimeout: 60000
  });

  // Make io available globally
  globalThis.io = io;

  // Connection event
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Listen for product updates from admin clients
    socket.on('product-update', (data) => {
      // Broadcast to all clients except sender
      socket.broadcast.emit('product-update', data);
      
      // Map to legacy event names for backward compatibility
      if (data.type === 'add') {
        socket.broadcast.emit('product:created', data.product);
      } else if (data.type === 'update') {
        socket.broadcast.emit('product:updated', data.product);
      } else if (data.type === 'delete') {
        socket.broadcast.emit('product:deleted', data.productId);
      }
    });

    // Disconnect event
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  return io;
}

/**
 * Emit product update event to all connected clients
 * @param eventType Type of update (add, update, delete)
 * @param data Product data or ID
 */
export function emitProductUpdate(eventType: 'add' | 'update' | 'delete', data: any) {
  if (!globalThis.io) {
    console.warn('[Socket] Cannot emit event: Socket.IO not initialized');
    return;
  }

  try {
    if (eventType === 'add') {
      globalThis.io.emit('product-update', { type: 'add', product: data });
      globalThis.io.emit('product:created', data);
    } else if (eventType === 'update') {
      globalThis.io.emit('product-update', { type: 'update', product: data });
      globalThis.io.emit('product:updated', data);
    } else if (eventType === 'delete') {
      globalThis.io.emit('product-update', { type: 'delete', productId: data });
      globalThis.io.emit('product:deleted', data);
    }
  } catch (error) {
    console.error('[Socket] Error emitting product update:', error);
  }
}