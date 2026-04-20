import db from '../../../config/db';
import type { Knex } from 'knex';

// ─── Shared select columns ─────────────────────────────────────────────────────
// Always join departments to include department details (eager loading).
const withDepartment = (trx?: Knex.Transaction) => {
  const query = trx ? trx('doctors as d') : db('doctors as d');
  return query
    .leftJoin('departments as dept', 'd.department_id', 'dept.id')
    .select(
      'd.*',
      'dept.name as department_name',
      'dept.code as department_code',
      'dept.description as department_description',
    );
};

// ─── Create Doctor ─────────────────────────────────────────────────────────────
export const createDoctor = async (data: {
  user_id: number;
  specialization: string | null;
  experience_years: number;
  bio: string;
  consultation_fee: number;
  department_id?: number;
}, trx?: Knex.Transaction) => {
  const query = trx ? trx('doctors') : db('doctors');
  
  const dbData = {
    user_id: data.user_id,
    specialization: data.specialization,
    years_of_experience: data.experience_years,
    bio: data.bio,
    consultation_fee: data.consultation_fee,
    department_id: data.department_id,
  };

  const [doctor] = await query.insert(dbData).returning('*');
  return doctor;
};

// ─── Find by doctors.id (PK) ───────────────────────────────────────────────────
export const findById = async (id: number) => {
  const doctor = await withDepartment().where('d.id', id).first();
  if (doctor) {
    const user = await db('users').where('id', doctor.user_id).first();
    doctor.user = user;
  }
  return doctor;
};

// ─── Find by user_id (FK to users table) ──────────────────────────────────────
export const findByUserId = async (userId: number, trx?: Knex.Transaction) => {
  return withDepartment(trx).where('d.user_id', userId).first();
};

// ─── Update by user_id ─────────────────────────────────────────────────────────
export const updateByUserId = async (userId: number, data: any, trx?: Knex.Transaction) => {
  const query = trx ? trx('doctors') : db('doctors');
  const [updated] = await query
    .where({ user_id: userId })
    .update(data)
    .returning('*');

  return updated;
};

// ─── Get All Doctors (with department details) ─────────────────────────────────
export const getAllDoctors = async (filters: { specialization?: string; name?: string } = {}) => {
  const query = withDepartment().leftJoin('users as u', 'd.user_id', 'u.id');

  if (filters.specialization) {
    query.where('d.specialization', 'ilike', `%${filters.specialization}%`);
  }
  
  if (filters.name) {
    query.where('u.full_name', 'ilike', `%${filters.name}%`);
  }

  return query.orderBy('d.id', 'asc');
};
