import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { env } from '../config/env.js';
import { adminAuth } from '../config/firebase-admin.js';

let io: SocketIOServer;

export const initializeSocketIO = (httpServer: HttpServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token || socket.handshake.headers['authorization'];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const idToken = typeof token === 'string' && token.startsWith('Bearer ') ? token.split('Bearer ')[1] : token;

      if (!adminAuth) {
        return next(new Error('Authentication error: Firebase Admin not initialized'));
      }

      const decodedToken = await adminAuth.verifyIdToken(idToken as string);
      
      socket.data.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'USER', // Assuming role is stored in custom claims
      };

      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}, User: ${socket.data.user?.uid}`);

    // Join room based on role
    if (socket.data.user?.role) {
      socket.join(`role:${socket.data.user.role}`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO is not initialized');
  }
  return io;
};

export const emitDbUpdate = (event: string, data: any) => {
  if (io) {
    io.emit('db_update', { event, data });
  }
};
