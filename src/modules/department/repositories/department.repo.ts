import db from '../../../config/db';

// ─── Count total departments ───────────────────────────────────────────────────
export const countDepartments = async (): Promise<number> => {
  const result = await db('departments').count('id as count').first();
  return Number(result?.count ?? 0);
};

// ─── Create ───────────────────────────────────────────────────────────────────
export const createDepartment = async (data: {
  name: string;
  code: string;
  description?: string;
  head_doctor_id?: number;
}) => {
  const [department] = await db('departments').insert(data).returning('*');
  return department;
};

// ─── Find all ─────────────────────────────────────────────────────────────────
export const getAllDepartments = async () => {
  return db('departments as dept')
    .leftJoin('doctors as d', 'dept.head_doctor_id', 'd.id')
    .leftJoin('users as u', 'd.user_id', 'u.id')
    .select(
      'dept.*',
      'u.full_name as head_doctor_name',
    )
    .orderBy('dept.name', 'asc');
};

// ─── Find by ID ───────────────────────────────────────────────────────────────
export const findById = async (id: number) => {
  return db('departments as dept')
    .leftJoin('doctors as d', 'dept.head_doctor_id', 'd.id')
    .leftJoin('users as u', 'd.user_id', 'u.id')
    .select(
      'dept.*',
      'u.full_name as head_doctor_name',
    )
    .where('dept.id', id)
    .first();
};

// ─── Find by name (for uniqueness check) ──────────────────────────────────────
export const findByName = async (name: string) => {
  return db('departments').where({ name }).first();
};

// ─── Find by code (for uniqueness check) ──────────────────────────────────────
export const findByCode = async (code: string) => {
  return db('departments').where({ code }).first();
};

// ─── Update ───────────────────────────────────────────────────────────────────
export const updateDepartment = async (id: number, data: Partial<{
  name: string;
  code: string;
  description: string;
  head_doctor_id: number;
}>) => {
  const [updated] = await db('departments')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return updated;
};

// ─── Delete ───────────────────────────────────────────────────────────────────
export const deleteDepartment = async (id: number) => {
  return db('departments').where({ id }).delete();
};

// ─── Count doctors in a department ────────────────────────────────────────────
export const countDoctorsInDepartment = async (departmentId: number): Promise<number> => {
  const result = await db('doctors')
    .where({ department_id: departmentId })
    .count('id as count')
    .first();
  return Number(result?.count ?? 0);
};
