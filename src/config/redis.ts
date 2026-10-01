import { createClient, RedisClientType } from 'redis';
import logger from '../common/utils/logger';

// ── Singleton client instance ─────────────────────────────────────────────────
// We use lazy-connect (no `connect()` call here) so that importing this module
// in unit tests does NOT require a live Redis instance.
// The connection is established once via `connectRedis()` called from server.ts.

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const redisClient: RedisClientType = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: false,
  },
  disableOfflineQueue: true,
});

redisClient.on('connect', () => {
  logger.info('Redis client connected', { url: redisUrl });
});

redisClient.on('ready', () => {
  logger.info('Redis client ready and accepting commands');
});

redisClient.on('error', (err: Error) => {
  logger.error('Redis client error', { error: err.message });
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting...');
});

redisClient.on('end', () => {
  logger.info('Redis client connection closed');
});

/**
 * Establishes the Redis connection.
 * Call this once from server.ts during startup, after DB connection succeeds.
 */
export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err: any) {
      logger.error('Initial Redis connection failed, falling back to memory cache', { error: err.message });
    }
  }
}

/**
 * Gracefully closes the Redis connection.
 * Call this inside your SIGTERM / SIGINT shutdown handlers.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection gracefully closed');
  }
}

export default redisClient;
