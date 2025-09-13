import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

declare global { // top-level global augmentation
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRoutes, { } from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import cartRoutes from './routes/cartRoutes';
import { notFound, errorHandler } from './middleware/errorHandler';
import { seedAdminIfNeeded } from './controllers/authController';

async function start() {
  await mongoose.connect(env.MONGO_URI);
  await seedAdminIfNeeded();
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: ['http://localhost:5173','http://localhost:8080', process.env.FRONTEND_ORIGIN || ''].filter(Boolean), credentials: true }
  });
  globalThis.io = io;
  io.on('connection', (socket: Socket) => {
    socket.emit('connected', { ts: Date.now() });
  });

  const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || origin.startsWith('http://localhost')) return cb(null, origin);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(morgan('dev'));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));
  app.use('/uploads', express.static(uploadsDir));

  app.use('/api', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/admin', (await import('./routes/adminProductRoutes')).default);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', (await import('./routes/orderRoutes')).default);

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // 404 + error handlers
  app.use(notFound);
  app.use(errorHandler);

  server.listen(env.PORT, () => console.log(`API + WS listening on http://localhost:${env.PORT}`));
}

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
