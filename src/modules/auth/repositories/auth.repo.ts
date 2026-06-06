import db from '../../../config/db';
import type { User } from '../../users/user.types';
import * as redisCache from '../../../common/services/redisCache.service';

export const saveResetToken = async (
  userId: number,
  token: string,
  expires: Date,
): Promise<void> => {
  const ttlInSeconds = Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000));
  
  // Store mapping from token -> userId (for lookup)
  await redisCache.set(`reset_token:${token}`, userId, ttlInSeconds);
  // Store mapping from userId -> token (for clearing by userId)
  await redisCache.set(`user_reset_token:${userId}`, token, ttlInSeconds);
};

export const findByResetToken = async (
  token: string,
): Promise<User | undefined> => {
  const userId = await redisCache.get<number>(`reset_token:${token}`);
  if (!userId) return undefined;

  return db<User>('users').where({ id: userId }).first();
};

export const ClearResetToken = async (userId: number): Promise<void> => {
  const token = await redisCache.get<string>(`user_reset_token:${userId}`);
  if (token) {
    await redisCache.del(`reset_token:${token}`);
  }
  await redisCache.del(`user_reset_token:${userId}`);
};

export const UpdatePassword = async (
  userId: number,
  newPassword: string,
): Promise<void> => {
  await db('users').where({ id: userId }).update({
    password_hash: newPassword,
    password_change_at: new Date(),
  });
  await ClearResetToken(userId);
};

export const changepassword = async (
  userId: number,
  newPassword: string,
): Promise<void> => {
  await db('users').where({ id: userId }).update({
    password_hash: newPassword,
    password_change_at: new Date(),
  });
};
