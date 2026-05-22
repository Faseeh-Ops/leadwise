import Redis from 'ioredis';
import { env } from './env';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // No lazyConnect — let ioredis auto-connect on creation
  retryStrategy: (times: number) => Math.min(times * 500, 10000),
};

// Primary connection (used by BullMQ queues + workers)
export const redis = new Redis(redisConfig);

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
    console.error('❌ Redis ECONNREFUSED — is Redis running? Run: docker compose up -d');
  } else {
    console.error('❌ Redis error:', err.message);
  }
});

export async function connectRedis(): Promise<void> {
  // With auto-connect, just wait for the ready event
  return new Promise((resolve, reject) => {
    if (redis.status === 'ready') return resolve();
    redis.once('ready', resolve);
    redis.once('error', reject);
    // Timeout after 10s
    setTimeout(() => reject(new Error('Redis connection timeout')), 10000);
  });
}
