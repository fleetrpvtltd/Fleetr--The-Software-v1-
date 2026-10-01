import { Queue, Worker, WorkerOptions, Processor } from 'bullmq';
import Redis from 'ioredis';
import { env } from './env.js';

// Shared connection for BullMQ
export const queueConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const createQueue = (name: string) => {
  return new Queue(name, {
    connection: queueConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  });
};

export const createWorker = (name: string, processor: Processor, opts?: Omit<WorkerOptions, 'connection'>) => {
  return new Worker(name, processor, {
    connection: queueConnection,
    ...opts,
  });
};
