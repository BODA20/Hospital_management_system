import db from '../../../config/db';
import type { RefreshTokenRecord, SessionCreateInput } from '../auth.types';

export async function createToken(data: SessionCreateInput) {
  const [token] = await db<RefreshTokenRecord>('refresh_tokens')
    .insert({
      user_id: data.user_id,
      token_hash: data.token_hash,
      expires_at: data.expires_at,
      user_agent: data.user_agent,
      ip: data.ip,
      revoked: false,
    })
    .returning('*');

  return token;
}

export async function findTokenByHash(hash: string) {
  return db<RefreshTokenRecord>('refresh_tokens')
    .where({
      token_hash: hash,
      revoked: false,
    })
    .andWhere('expires_at', '>', new Date())
    .first();
}

export async function findTokenById(id: number) {
  return db<RefreshTokenRecord>('refresh_tokens').where({ id }).first();
}

export async function revokeToken(id: number) {
  return db('refresh_tokens').where({ id }).update({
    revoked: true,
    revoked_at: db.fn.now(),
  });
}

export async function replaceToken(oldId: number, newId: number) {
  return db('refresh_tokens').where({ id: oldId }).update({
    revoked: true,
    revoked_at: db.fn.now(),
    replaced_by: newId,
  });
}

export async function revokeUserTokens(userId: number) {
  return db('refresh_tokens').where({ user_id: userId }).update({
    revoked: true,
    revoked_at: db.fn.now(),
  });
}

export async function deleteExpiredTokens() {
  return db('refresh_tokens').where('expires_at', '<', new Date()).del();
}
