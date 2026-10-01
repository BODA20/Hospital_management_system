import db from '../../../config/db';
import type { Knex } from 'knex';

// ─── Public-facing shapes ─────────────────────────────────────────────────────

export interface PublicUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  phone?: string | null;
  is_active: boolean;
  is_verified?: boolean;
  created_at: Date;
}

export interface User extends PublicUser {
  password_hash: string;
}

export interface NewUserInput {
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  phone?: string | null;
}

export interface UpdateProfileDTO {
  full_name?: string;
  phone?: string;
}

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient';

// ─── Auth-specific shape needed by protect middleware ──────────────────────────
export interface AuthUserRow {
  id: number;
  role: string;
  is_active: boolean;
}

// ─── Shared SELECT list ────────────────────────────────────────────────────────
const PUBLIC_COLS = ['id', 'full_name', 'email', 'role', 'phone', 'is_active', 'is_verified', 'created_at'] as const;

// ─── Helpers: use db.raw ───────────────────────────────────────────────────────

/** Insert a row into `users`, returning a PublicUser-shaped result. */
async function rawInsertUser(
  data: { full_name: string; email: string; password_hash: string; role: string; phone?: string | null },
  trx?: Knex.Transaction,
): Promise<PublicUser> {
  const knex = trx ?? db;
  const phoneValue = data.phone && data.phone.trim() ? data.phone.trim() : 'NOT_PROVIDED';
  const result = await knex.raw(
    `INSERT INTO users (full_name, email, password_hash, role, phone)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, full_name, email, role, phone, is_active, is_verified, created_at`,
    [data.full_name, data.email, data.password_hash, data.role, phoneValue],
  );
  const userRow = result.rows ? result.rows[0] : (Array.isArray(result) ? result[0] : result);
  return userRow as PublicUser;
}

// ─── Read queries ─────────────────────────────────────────────────────────────

export const findAllUsers = async (): Promise<PublicUser[]> => {
  const result = await db.raw(
    `SELECT id, full_name, email, role, phone, is_active, is_verified, created_at FROM users`,
  );
  return (result.rows || (Array.isArray(result) ? result : [])) as PublicUser[];
};

export const findUserById = async (id: number): Promise<PublicUser | undefined> => {
  const result = await db.raw(
    `SELECT id, full_name, email, role, phone, is_active, is_verified, created_at FROM users WHERE id = ?`,
    [id],
  );
  const rows = result.rows || (Array.isArray(result) ? result : [result]);
  return rows[0] as PublicUser | undefined;
};

export const findUserByIdWithDepartment = async (id: number): Promise<any | undefined> => {
  const result = await db.raw(
    `SELECT u.id,
            u.full_name,
            u.email,
            u.role,
            u.phone,
            u.is_active,
            u.is_verified,
            u.created_at,
            u.assigned_shift,
            d.id      AS department_id,
            d.name_en AS department_name,
            COALESCE(doc.license_number, nur.license_number) AS license_number
       FROM users u
  LEFT JOIN doctors     doc ON u.id = doc.user_id
  LEFT JOIN nurses      nur ON u.id = nur.user_id
  LEFT JOIN departments d   ON d.id = doc.department_id OR d.id = nur.department_id
      WHERE u.id = ?
      LIMIT 1`,
    [id],
  );
  const row = result.rows[0];
  console.log('[DEBUG REPO USERS findUserByIdWithDepartment]:', row);
  return row;
};

export const getAllUsersWithDepartments = async (): Promise<any[]> => {
  const result = await db.raw(
    `SELECT u.id,
            u.full_name,
            u.email,
            u.role,
            u.phone,
            u.is_active,
            u.is_verified,
            u.created_at,
            u.assigned_shift,
            d.id      AS department_id,
            d.name_en AS department_name,
            COALESCE(doc.license_number, nur.license_number) AS license_number
       FROM users u
  LEFT JOIN doctors     doc ON u.id = doc.user_id
  LEFT JOIN nurses      nur ON u.id = nur.user_id
  LEFT JOIN departments d   ON d.id = doc.department_id OR d.id = nur.department_id
   ORDER BY u.created_at DESC`,
  );
  const rows = result.rows;
  console.log(`[DEBUG REPO USERS getAllUsersWithDepartments]: Fetched ${rows.length} rows`);
  if (rows.length > 0) console.log('[DEBUG REPO USERS SAMPLE]:', rows[0]);
  return rows;
};

// Used exclusively by the protect middleware — minimal auth fields only.
export const findUserForAuth = async (id: number): Promise<AuthUserRow | undefined> => {
  const result = await db.raw<{ rows: AuthUserRow[] }>(
    `SELECT id, role, is_active FROM users WHERE id = ?`,
    [id],
  );
  return result.rows[0];
};

export async function findUserWithPasswordById(id: number): Promise<User | undefined> {
  const result = await db.raw(
    `SELECT id, full_name, email, password_hash, role, phone, is_active, is_verified, created_at FROM users WHERE id = ?`,
    [id],
  );
  const rows = result.rows || (Array.isArray(result) ? result : [result]);
  return rows[0] as User | undefined;
}

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const result = await db.raw(
    `SELECT id, full_name, email, password_hash, role, phone, is_active, is_verified, created_at
       FROM users WHERE email = ?`,
    [email],
  );
  const rows = result.rows || (Array.isArray(result) ? result : [result]);
  return rows[0] as User | undefined;
};

// ─── Write queries ────────────────────────────────────────────────────────────

export const createUser = async (data: NewUserInput, trx?: Knex.Transaction): Promise<PublicUser> => {
  return rawInsertUser(
    { full_name: data.full_name, email: data.email, password_hash: data.password_hash, role: data.role, phone: data.phone },
    trx,
  );
};

export const updateUserById = async (
  id: number,
  data: Partial<UpdateProfileDTO>,
  trx?: Knex.Transaction,
): Promise<PublicUser> => {
  const knex = trx ?? db;
  const result = await knex.raw(
    `UPDATE users
        SET full_name = COALESCE(?, full_name),
            phone     = COALESCE(?, phone)
      WHERE id = ?
      RETURNING id, full_name, role, email, phone, is_active, is_verified, created_at`,
    [data.full_name ?? null, data.phone ?? null, id],
  );
  const rows = result.rows || (Array.isArray(result) ? result : [result]);
  return rows[0] as PublicUser;
};

export const deactivateUser = async (id: number): Promise<PublicUser> => {
  const result = await db.raw<{ rows: PublicUser[] }>(
    `UPDATE users SET is_active = false
     WHERE id = ?
     RETURNING id, full_name, email, role, phone, is_active, is_verified, created_at`,
    [id],
  );
  return result.rows[0];
};

export const updateEmail = async (userId: number, newEmail: string): Promise<void> => {
  await db.raw(`UPDATE users SET email = ? WHERE id = ?`, [newEmail, userId]);
};

export const updateUserRole = async (userId: number, role: UserRole): Promise<void> => {
  await db.raw(`UPDATE users SET role = ? WHERE id = ?`, [role, userId]);
};

export const adminUpdateUser = async (
  id: number,
  data: {
    full_name?: string;
    phone?: string | null;
    role?: string;
    is_active?: boolean;
    /** Users table column added in migration 20260709000200 */
    assigned_shift?: 'Morning' | 'Night';
  },
  trx?: Knex.Transaction,
): Promise<PublicUser> => {
  const knex = trx ?? db;

  const updates: Record<string, any> = {};
  if (data.full_name    !== undefined) updates.full_name     = data.full_name;
  if (data.phone        !== undefined) updates.phone        = data.phone;
  if (data.role         !== undefined) updates.role          = data.role;
  if (data.is_active    !== undefined) updates.is_active     = data.is_active;
  if (data.assigned_shift !== undefined) updates.assigned_shift = data.assigned_shift;

  if (Object.keys(updates).length === 0) {
    // Nothing to update — return the current row unchanged
    const current = await knex.raw<{ rows: PublicUser[] }>(
      `SELECT id, full_name, email, role, phone, is_active, is_verified, created_at FROM users WHERE id = ?`,
      [id],
    );
    return current.rows[0];
  }

  const query = trx ? trx('users') : db('users');
  const [updated] = await query
    .where({ id })
    .update(updates)
    .returning(['id', 'full_name', 'email', 'role', 'phone', 'is_active', 'is_verified', 'created_at']);

  return updated as PublicUser;
};

export const emailExists = async (email: string): Promise<boolean> => {
  const result = await db.raw<{ rows: { id: number }[] }>(
    `SELECT id FROM users WHERE email = ? LIMIT 1`,
    [email],
  );
  return result.rows.length > 0;
};

export const updatePasswordByEmail = async (email: string, passwordHash: string): Promise<void> => {
  await db.raw(`UPDATE users SET password_hash = ? WHERE email = ?`, [passwordHash, email]);
};
