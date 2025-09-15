import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initializeSocketIO } from './socket';

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
  const io = initializeSocketIO(server);

  const uploadsDir = path.join(process.cwd(), 'server', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  app.use(cors({
    origin: (origin, cb) => {
      // Allow no-origin (server-to-server) and localhost/127.0.0.1 during dev.
      if (!origin) return cb(null, origin);
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return cb(null, origin);
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

  const port = parseInt(String(env.PORT), 10) || 5000;
  // Bind explicitly to IPv4 loopback to avoid Node/OS picking an IPv6-only address
  server.listen(port, '127.0.0.1', () => {
    console.log(`API + WS listening on http://127.0.0.1:${port}`);
  });
}

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
