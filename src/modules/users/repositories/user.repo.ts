import db from '../../../config/db';
import type { Knex } from 'knex';
import type {
  PublicUser,
  NewUserInput,
  User,
  UpdateProfileDTO,
  UserRole,
} from '../user.types';

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
      'password',
      'role',
      'is_active',
      'created_at',
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
  trx?: Knex.Transaction, // البراميتر التالت تمام
): Promise<any> => { // خليناها any مؤقتاً عشان الـ Returning
  
  // 1. ضيف الـ phone هنا عشان يتعدل
  const allowedFields = ['full_name', 'phone']; 
  
  const filteredData = Object.keys(data)
    .filter((key) => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key as keyof UpdateProfileDTO] = data[key as keyof UpdateProfileDTO];
      return obj;
    }, {} as any);

  // 2. استخدم الـ Query Builder بذكاء مع الـ trx
  const query = db('users')
    .where({ id })
    .update(filteredData)
    .returning(['id', 'full_name', 'role', 'email', 'phone', 'is_active', 'created_at']);

  // 3. دي أهم حتة: اربط الاستعلام بالـ Transaction لو موجودة
  if (trx) {
    query.transacting(trx);
  }

  const [user] = await query;
  return user;
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
  trx?: Knex.Transaction
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
