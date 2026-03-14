import db from '../../config/db';
import type { PublicUser, NewUserInput, User } from './user.types';

export const findAllUsers = async (): Promise<PublicUser[]> => {
  return db('users')
    .select('id', 'name', 'email', 'role', 'is_active', 'created_at')
    .where('is_active', true);
};

export const findUserById = async (
  id: number,
): Promise<PublicUser | undefined> => {
  return db('users')
    .select('id', 'name', 'email', 'role', 'is_active', 'created_at')
    .where({ id })
    .first();
};

export const findUserByEmail = async (
  email: string,
): Promise<User | undefined> => {
  return db<User>('users')
    .select(
      'id',
      'name',
      'email',
      'password',
      'role',
      'is_active',
      'created_at',
    )
    .where({ email })
    .first();
};

export const createUser = async (data: NewUserInput): Promise<PublicUser> => {
  const [user] = await db<User>('users')
    .insert(data)
    .returning(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

  return user;
};

export const updateUserById = async (
  id: number,
  data: Partial<Omit<User, 'id' | 'password' | 'created_at'>>,
): Promise<PublicUser> => {
  const [user] = await db<User>('users')
    .where({ id })
    .update(data)
    .returning(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

  return user;
};

export const deactivateUser = async (id: number): Promise<PublicUser> => {
  const [user] = await db<User>('users')
    .where({ id })
    .update({ is_active: false })
    .returning(['id', 'name', 'email', 'role', 'is_active', 'created_at']);

  return user;
};

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

export const saveEmailChangeToken = async (
  userId: number,
  token: string,
  newEmail: string,
  expires: Date,
): Promise<void> => {
  await db('users').where({ id: userId }).update({
    email_change_token: token,
    pending_email: newEmail,
    email_change_expires: expires,
  });
};

export const updateEmail = async (
  userId: number,
  newEmail: string,
): Promise<void> => {
  await db('users').where({ id: userId }).update({
    email: newEmail,
    pending_email: null,
  });
};

export const clearEmailChangeToken = async (userId: number): Promise<void> => {
  await db('users').where({ id: userId }).update({
    email_change_token: null,
    pending_email: null,
    email_change_expires: null,
  });
};

export const findByEmailToken = async (
  token: string,
): Promise<User | undefined> => {
  return db<User>('users').where({ email_change_token: token }).first();
};

export const updateEmailChangeExpires = async (
  userId: number,
  expires: Date,
): Promise<void> => {
  await db('users')
    .where({ id: userId })
    .update({ email_change_expires: expires });
};
