import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export const connectDB = async (retryCount = 0): Promise<void> => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    isConnected = true;
    console.log(`[${new Date().toISOString()}] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] MongoDB Connection Error:`, error);
    
    if (retryCount < 5) {
      const backoffDelay = Math.pow(2, retryCount) * 1000;
      console.log(`Retrying connection in ${backoffDelay}ms (Attempt ${retryCount + 1}/5)...`);
      setTimeout(() => connectDB(retryCount + 1), backoffDelay);
    } else {
      console.error('Failed to connect to MongoDB after 5 attempts.');
      process.exit(1);
    }
  }
};

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log(`[${new Date().toISOString()}] Mongoose connected to DB.`);
});

mongoose.connection.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Mongoose connection error:`, err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.log(`[${new Date().toISOString()}] Mongoose disconnected.`);
});

export const isDbConnected = () => isConnected;
