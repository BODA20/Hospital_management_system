import db from '../../../config/db';
import type { Knex } from 'knex';
import type {
  PublicUser,
  NewUserInput,
  User,
  UpdateProfileDTO,
  UserRole,
} from '../user.types';

// ─── Auth-specific shape needed by protect middleware ──────────────────────────
export interface AuthUserRow {
  id: number;
  role: string;
  is_active: boolean;
  password_change_at: Date | null;
}

export const findAllUsers = async (): Promise<PublicUser[]> => {
  return db('users')
    .select('id', 'full_name', 'email', 'phone', 'role', 'is_active', 'created_at');
};

export const findUserById = async (
  id: number,
): Promise<PublicUser | undefined> => {
  return db('users')
    .select('id', 'full_name', 'email', 'phone', 'role', 'is_active', 'created_at')
    .where({ id })
    .first();
};

// Used exclusively by the protect middleware — selects only the fields needed
// for auth checks to keep the payload minimal.
export const findUserForAuth = async (
  id: number,
): Promise<AuthUserRow | undefined> => {
  return db<User>('users')
    .select('id', 'role', 'is_active', 'password_change_at')
    .where({ id })
    .first() as Promise<AuthUserRow | undefined>;
};

export async function findUserWithPasswordById(
  id: number,
): Promise<User | undefined> {
  return db<User>('users').where({ id }).first();
}

export const findUserByEmail = async (
  email: string,
): Promise<User | undefined> => {
  return db<User>('users')
    .select(
      'id',
      'full_name',
      'email',
      'phone',
      'password_hash',
      'role',
      'is_active',
      'created_at',
      'password_change_at',
    )
    .where({ email })
    .first();
};

export const createUser = async (data: NewUserInput, trx?: Knex.Transaction): Promise<PublicUser> => {
  const query = trx ? trx<User>('users') : db<User>('users');
  const [user] = await query
    .insert(data)
    .returning(['id', 'full_name', 'email', 'phone', 'role', 'is_active', 'created_at']);

  return user;
};

export const updateUserById = async (
  id: number,
  data: Partial<UpdateProfileDTO>,
  trx?: Knex.Transaction,
): Promise<PublicUser> => {
  const allowedFields: (keyof UpdateProfileDTO)[] = ['full_name', 'phone'];

  const filteredData = (Object.keys(data) as (keyof UpdateProfileDTO)[])
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = (data as any)[key];
      return obj;
    }, {} as Partial<UpdateProfileDTO>);

  const query = db('users')
    .where({ id })
    .update(filteredData)
    .returning(['id', 'full_name', 'role', 'email', 'phone', 'is_active', 'created_at']);

  if (trx) {
    query.transacting(trx);
  }

  const [user] = await query;
  return user as PublicUser;
};

export const deactivateUser = async (id: number): Promise<PublicUser> => {
  const [user] = await db<User>('users')
    .where({ id })
    .update({ is_active: false })
    .returning(['id', 'full_name', 'email', 'phone', 'role', 'is_active', 'created_at']);

  return user;
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

export const updateUserRole = async (
  userId: number,
  role: UserRole,
): Promise<void> => {
  await db('users').where({ id: userId }).update({ role });
};

export const adminUpdateUser = async (
  id: number,
  data: { full_name?: string; role?: string; is_active?: boolean },
  trx?: Knex.Transaction,
): Promise<PublicUser> => {
  const filteredData: Partial<User> = {};
  if (data.full_name !== undefined) filteredData.full_name = data.full_name;
  if (data.role !== undefined) filteredData.role = data.role as UserRole;
  if (data.is_active !== undefined) filteredData.is_active = data.is_active;

  const query = trx ? trx('users') : db('users');

  const [user] = await query
    .where({ id })
    .update(filteredData)
    .returning(['id', 'full_name', 'email', 'phone', 'role', 'is_active', 'created_at']);

  return user;
};
