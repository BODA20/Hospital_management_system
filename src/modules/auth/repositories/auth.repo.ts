import db from '../../../config/db';
import type { User } from '../../users/user.types';

export const saveResetToken = async (
  userId: number,
  token: string,
  expires: Date,
): Promise<void> => {
  await db('users')
    .where({ id: userId })
    .update({ password_reset_token: token, password_reset_expires: expires });
};

export const findByResetToken = async (
  token: string,
): Promise<User | undefined> => {
  return db<User>('users')
    .where({ password_reset_token: token })
    .andWhere('password_reset_expires', '>', new Date())
    .first();
};

export const UpdatePassword = async (
  userId: number,
  newPassword: string,
): Promise<void> => {
  await db('users').where({ id: userId }).update({
    password: newPassword,
    password_reset_token: null,
    password_reset_expires: null,
    password_change_at: new Date(),
  });
};

export const ClearResetToken = async (userId: number): Promise<void> => {
  await db('users')
    .where({ id: userId })
    .update({ password_reset_token: null, password_reset_expires: null });
};

export const changepassword = async (
  userId: number,
  newPassword: string,
): Promise<void> => {
  await db('users').where({ id: userId }).update({
    password: newPassword,
    password_change_at: new Date(),
  });
};
