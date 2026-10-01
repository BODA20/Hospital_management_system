import redisClient from '../../config/redis';
import logger from '../utils/logger';

// ── Generic Redis Cache Service with In-Memory Fallback ──────────────────────────
// When Redis is offline, we fallback to a local Map to keep sessions and cache working.

const fallbackCache = new Map<string, { value: string; expiresAt: number | null }>();

// Periodically evict expired items from memory fallback cache
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of fallbackCache.entries()) {
    if (item.expiresAt && item.expiresAt < now) {
      fallbackCache.delete(key);
    }
  }
}, 60000).unref();

const isRedisAvailable = (): boolean => {
  return redisClient.isOpen && redisClient.isReady;
};

/**
 * Stores a value in Redis with an optional TTL. Fallbacks to memory cache if Redis is down.
 */
export async function set(
  key: string,
  value: unknown,
  ttlInSeconds?: number,
): Promise<void> {
  const serialised = typeof value === 'string' ? value : JSON.stringify(value);

  if (isRedisAvailable()) {
    try {
      if (ttlInSeconds !== undefined) {
        await redisClient.set(key, serialised, { EX: ttlInSeconds });
      } else {
        await redisClient.set(key, serialised);
      }
      return;
    } catch (err: any) {
      logger.error('Redis SET failed, falling back to memory', { key, error: err.message });
    }
  }

  // Fallback to memory cache
  const expiresAt = ttlInSeconds !== undefined ? Date.now() + (ttlInSeconds * 1000) : null;
  fallbackCache.set(key, { value: serialised, expiresAt });
}

/**
 * Retrieves a value from Redis and deserialises it back to type T. Fallbacks to memory cache if Redis is down.
 */
export async function get<T>(key: string): Promise<T | null> {
  if (isRedisAvailable()) {
    try {
      const raw = await redisClient.get(key);
      if (raw !== null) {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      }
      return null;
    } catch (err: any) {
      logger.error('Redis GET failed, checking memory fallback', { key, error: err.message });
    }
  }

  // Fallback to memory cache
  const item = fallbackCache.get(key);
  if (!item) return null;

  if (item.expiresAt && item.expiresAt < Date.now()) {
    fallbackCache.delete(key);
    return null;
  }

  const raw = item.value;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

/**
 * Deletes a key from Redis, invalidating any cached value. Fallbacks to memory cache if Redis is down.
 */
export async function del(key: string): Promise<void> {
  if (isRedisAvailable()) {
    try {
      await redisClient.del(key);
      return;
    } catch (err: any) {
      logger.error('Redis DEL failed, deleting from memory fallback', { key, error: err.message });
    }
  }

  fallbackCache.delete(key);
}

/**
 * Returns `true` if the key exists in Redis. Fallbacks to memory cache if Redis is down.
 */
export async function exists(key: string): Promise<boolean> {
  if (isRedisAvailable()) {
    try {
      const count = await redisClient.exists(key);
      return count > 0;
    } catch (err: any) {
      logger.error('Redis EXISTS failed, checking memory fallback', { key, error: err.message });
    }
  }

  const item = fallbackCache.get(key);
  if (!item) return false;

  if (item.expiresAt && item.expiresAt < Date.now()) {
    fallbackCache.delete(key);
    return false;
  }

  return true;
}
