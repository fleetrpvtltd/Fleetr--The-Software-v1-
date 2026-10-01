import Redis from 'ioredis';
import { env } from './env.js';

let isConnected = false;

export const redis = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    if (times > 5) {
      console.error('Failed to connect to Redis after 5 attempts.');
      return null; // Stop retrying
    }
    const delay = Math.min(Math.pow(2, times) * 1000, 10000);
    console.log(`Retrying Redis connection in ${delay}ms...`);
    return delay;
  },
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  isConnected = true;
  console.log(`[${new Date().toISOString()}] Redis connected.`);
});

redis.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] Redis connection error:`, err);
});

redis.on('close', () => {
  isConnected = false;
  console.log(`[${new Date().toISOString()}] Redis connection closed.`);
});

export const isRedisConnected = () => isConnected;

export const cacheGet = async (key: string): Promise<string | null> => {
  if (!isConnected) return null;
  try {
    return await redis.get(key);
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttlSeconds?: number): Promise<boolean> => {
  if (!isConnected) return false;
  try {
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

export const cacheDel = async (key: string): Promise<boolean> => {
  if (!isConnected) return false;
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};
