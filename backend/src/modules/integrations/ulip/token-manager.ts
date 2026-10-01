import axios from 'axios';
import { env } from '../../../config/env.js';
import { cacheGet, cacheSet } from '../../../config/redis.js';
import { AppError } from '../../../middleware/error-handler.js';

const ULIP_TOKEN_KEY = 'ulip:auth_token';

let memoryToken: string | null = null;
let tokenExpiryTime: number | null = null;

export const generateUlipToken = async (): Promise<string> => {
  if (!env.ULIP_BASE_URL || !env.ULIP_USERNAME || !env.ULIP_PASSWORD) {
    throw new AppError('ULIP credentials not configured', 500);
  }

  try {
    const response = await axios.post(`${env.ULIP_BASE_URL}/ulip/v1.0.0/user/login`, {
      username: env.ULIP_USERNAME,
      password: env.ULIP_PASSWORD
    });

    const token = response.data?.response?.id;
    if (!token) {
      throw new Error('No token in response');
    }

    return token;
  } catch (error: any) {
    console.error('Failed to generate ULIP token:', error.message);
    throw new AppError('Failed to authenticate with ULIP', 502);
  }
};

export const getUlipToken = async (): Promise<string> => {
  // Check Redis first
  const cachedToken = await cacheGet(ULIP_TOKEN_KEY);
  if (cachedToken) {
    return cachedToken;
  }

  // Memory fallback
  if (memoryToken && tokenExpiryTime && Date.now() < tokenExpiryTime) {
    return memoryToken;
  }

  // Generate new token
  const token = await generateUlipToken();
  
  // Set to Redis (validity 30 mins = 1800s, refresh at 25 mins = 1500s)
  await cacheSet(ULIP_TOKEN_KEY, token, 1500);
  
  // Set to Memory
  memoryToken = token;
  tokenExpiryTime = Date.now() + 25 * 60 * 1000;

  return token;
};
