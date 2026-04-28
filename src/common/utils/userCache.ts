// ─── In-Memory User Auth Cache ─────────────────────────────────────────────────
// Caches the minimal user data needed by the protect middleware for 60 seconds.
// This eliminates a DB round-trip on every authenticated request.
// On deactivation or password change, the cache entry is explicitly invalidated.

export interface CachedAuthUser {
  id: number;
  role: string;
  is_active: boolean;
  password_change_at: Date | null | undefined;
}

interface CacheEntry {
  data: CachedAuthUser;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

const cache = new Map<number, CacheEntry>();

export function getCachedUser(id: number): CachedAuthUser | null {
  const entry = cache.get(id);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(id);
    return null;
  }

  return entry.data;
}

export function setCachedUser(user: CachedAuthUser): void {
  cache.set(user.id, {
    data: user,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function invalidateUserCache(userId: number): void {
  cache.delete(userId);
}

export function clearAllUserCache(): void {
  cache.clear();
}
