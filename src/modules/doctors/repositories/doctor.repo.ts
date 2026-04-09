import db from '../../../config/db';

// ─── Shared select columns ─────────────────────────────────────────────────────
// Always join departments to include department details (eager loading).
const withDepartment = () =>
  db('doctors as d')
    .leftJoin('departments as dept', 'd.department_id', 'dept.id')
    .select(
      'd.*',
      'dept.name as department_name',
      'dept.code as department_code',
      'dept.description as department_description',
    );

// ─── Create Doctor ─────────────────────────────────────────────────────────────
export const createDoctor = async (data: {
  user_id: number;
  specialization: string | null;
  experience_years: number;
  bio: string;
  consultation_fee: number;
  department_id?: number;
}) => {
  const [doctor] = await db('doctors').insert(data).returning('*');
  return doctor;
};

// ─── Find by doctors.id (PK) ───────────────────────────────────────────────────
export const findById = async (id: number) => {
  return withDepartment().where('d.id', id).first();
};

// ─── Find by user_id (FK to users table) ──────────────────────────────────────
export const findByUserId = async (userId: number) => {
  return withDepartment().where('d.user_id', userId).first();
};

// ─── Update by user_id ─────────────────────────────────────────────────────────
export const updateByUserId = async (userId: number, data: any) => {
  const [updated] = await db('doctors')
    .where({ user_id: userId })
    .update(data)
    .returning('*');

  return updated;
};

// ─── Get All Doctors (with department details) ─────────────────────────────────
export const getAllDoctors = async () => {
  return withDepartment().orderBy('d.id', 'asc');
};
