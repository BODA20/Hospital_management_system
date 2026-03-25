import * as sessionRepo from '../repositories/refreshToken.repo';
import { generateRefreshToken } from '../utils/generateToken';
import { hashToken } from '../utils/hashToken';

const REFRESH_EXPIRES_DAYS = 7;

function getExpiryDate() {
  return new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: number) {
  const refreshToken = generateRefreshToken();

  const hash = hashToken(refreshToken);

  const session = await sessionRepo.createToken({
    user_id: userId,
    token_hash: hash,
    expires_at: getExpiryDate(),
  });

  return {
    refreshToken,
    session,
  };
}

export async function validateSession(refreshToken: string) {
  const hash = hashToken(refreshToken);

  const session = await sessionRepo.findTokenByHash(hash);

  if (!session) {
    throw new Error('Invalid refresh token');
  }

  return session;
}

export async function rotateSession(oldToken: string) {
  const oldHash = hashToken(oldToken);

  const oldSession = await sessionRepo.findTokenByHash(oldHash);

  if (!oldSession) {
    throw new Error('Invalid refresh token');
  }

  if (oldSession.revoked) {
    throw new Error('Refresh token already used');
  }

  if (oldSession.expires_at < new Date()) {
    throw new Error('Refresh token expired');
  }
  const newToken = generateRefreshToken();
  const newHash = hashToken(newToken);

  const newSession = await sessionRepo.createToken({
    user_id: oldSession.user_id,
    token_hash: newHash,
    expires_at: getExpiryDate(),
  });

  await sessionRepo.replaceToken(oldSession.id, newSession.id);

  return {
    refreshToken: newToken,
    userId: oldSession.user_id,
  };
}

export async function revokeSession(refreshToken: string) {
  const hash = hashToken(refreshToken);

  const session = await sessionRepo.findTokenByHash(hash);

  if (!session) return;

  await sessionRepo.revokeToken(session.id);
}

export async function revokeAllUserSessions(userId: number) {
  await sessionRepo.revokeUserTokens(userId);
}
