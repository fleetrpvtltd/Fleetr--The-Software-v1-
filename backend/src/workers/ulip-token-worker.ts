import { createQueue, createWorker } from '../config/queue.js';
import { generateUlipToken } from '../modules/integrations/ulip/token-manager.js';
import { cacheSet } from '../config/redis.js';

const QUEUE_NAME = 'ulip-token-refresh';

export const ulipTokenQueue = createQueue(QUEUE_NAME);

export const ulipTokenWorker = createWorker(QUEUE_NAME, async (job) => {
  try {
    const token = await generateUlipToken();
    await cacheSet('ulip:auth_token', token, 1500);
    console.log(`[ULIP Token Worker] Successfully refreshed token at ${new Date().toISOString()}`);
  } catch (error: any) {
    console.error(`[ULIP Token Worker] Failed to refresh token:`, error.message);
    throw error;
  }
});

// Setup repeatable job (every 25 minutes)
export const setupUlipTokenRefresh = async () => {
  await ulipTokenQueue.add('refresh', {}, {
    repeat: {
      pattern: '*/25 * * * *' // Every 25 minutes
    }
  });
};
