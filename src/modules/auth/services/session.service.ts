import { generateRefreshToken } from '../utils/generateToken';
import { hashToken } from '../utils/hashToken';
import * as cache from '../../../common/services/redisCache.service';

const REFRESH_EXPIRES_DAYS = 7;
const REFRESH_TTL_SECONDS = REFRESH_EXPIRES_DAYS * 24 * 60 * 60;

function buildKey(hash: string): string {
  return `rt:${hash}`;
}

function buildUserKey(userId: number): string {
  return `user_rt:${userId}`;
}

async function linkTokenToUser(userId: number, hash: string) {
  const tokens = await cache.get<string[]>(buildUserKey(userId)) || [];
  tokens.push(hash);
  await cache.set(buildUserKey(userId), tokens, REFRESH_TTL_SECONDS);
}

export async function createSession(userId: number) {
  const refreshToken = generateRefreshToken();
  const hash = hashToken(refreshToken);

  await cache.set(buildKey(hash), { userId }, REFRESH_TTL_SECONDS);
  await linkTokenToUser(userId, hash);

  return {
    refreshToken,
  };
}

export async function validateSession(refreshToken: string) {
  const hash = hashToken(refreshToken);
  const session = await cache.get<{ userId: number }>(buildKey(hash));

  if (!session) {
    throw new Error('Invalid refresh token');
  }

  return session;
}

export async function rotateSession(oldToken: string) {
  const oldHash = hashToken(oldToken);
  const oldSession = await cache.get<{ userId: number }>(buildKey(oldHash));

  if (!oldSession) {
    throw new Error('Invalid refresh token');
  }

  // Revoke old token
  await cache.del(buildKey(oldHash));

  const newToken = generateRefreshToken();
  const newHash = hashToken(newToken);

  await cache.set(buildKey(newHash), { userId: oldSession.userId }, REFRESH_TTL_SECONDS);
  await linkTokenToUser(oldSession.userId, newHash);

  return {
    refreshToken: newToken,
    userId: oldSession.userId,
  };
}

export async function revokeSession(refreshToken: string) {
  const hash = hashToken(refreshToken);
  await cache.del(buildKey(hash));
}

export async function revokeAllUserSessions(userId: number) {
  const tokens = await cache.get<string[]>(buildUserKey(userId)) || [];
  for (const hash of tokens) {
    await cache.del(buildKey(hash));
  }
  await cache.del(buildUserKey(userId));
}
