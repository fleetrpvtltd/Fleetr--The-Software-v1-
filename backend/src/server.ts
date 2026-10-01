import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDB, isDbConnected } from './config/db.js';
import { redis, isRedisConnected } from './config/redis.js';
import { initializeSocketIO } from './realtime/socket.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(compression());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Parse JSON bodies, saving raw body for webhooks if needed
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Connect to DB
connectDB();

const httpServer = http.createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

import apiRouter from './modules/api-router.js';

// Mount API router
app.use('/api', apiRouter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: isDbConnected(),
    redis: isRedisConnected()
  });
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT;

const server = httpServer.listen(PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
  });
  
  if (isDbConnected()) {
      const mongoose = await import('mongoose');
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
  }

  if (isRedisConnected()) {
      redis.quit();
      console.log('Redis connection closed.');
  }
  
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
