import redisClient from '../../config/redis';

// ── Generic Redis Cache Service ───────────────────────────────────────────────
// All methods are typed and handle JSON serialisation/deserialisation internally.
// This is the only file in the codebase that should call redisClient directly,
// keeping Redis implementation details out of business logic.

/**
 * Stores a value in Redis with an optional TTL.
 *
 * @param key          - The Redis key (use a consistent namespace, e.g. "blacklist:token")
 * @param value        - Any serialisable value; objects are JSON-stringified automatically
 * @param ttlInSeconds - Optional TTL. If omitted the key persists indefinitely.
 */
export async function set(
  key: string,
  value: unknown,
  ttlInSeconds?: number,
): Promise<void> {
  const serialised = typeof value === 'string' ? value : JSON.stringify(value);

  if (ttlInSeconds !== undefined) {
    // EX sets expiry in seconds
    await redisClient.set(key, serialised, { EX: ttlInSeconds });
  } else {
    await redisClient.set(key, serialised);
  }
}

/**
 * Retrieves a value from Redis and deserialises it back to type T.
 *
 * @returns The parsed value, or `null` if the key does not exist / has expired.
 */
export async function get<T>(key: string): Promise<T | null> {
  const raw = await redisClient.get(key);
  if (raw === null) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // The stored value is a plain string (not JSON) — return it as-is
    return raw as unknown as T;
  }
}

/**
 * Deletes a key from Redis, invalidating any cached value.
 *
 * @param key - The exact Redis key to delete.
 */
export async function del(key: string): Promise<void> {
  await redisClient.del(key);
}

/**
 * Returns `true` if the key exists in Redis (useful for blacklist checks).
 */
export async function exists(key: string): Promise<boolean> {
  const count = await redisClient.exists(key);
  return count > 0;
}
