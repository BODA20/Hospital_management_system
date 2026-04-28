import db from '../../../config/db';
import type { Knex } from 'knex';
import { UpdateDoctorInput } from '../doctor.schema';

export interface DoctorDbRow {
  id: number;
  user_id: number;
  specialization: string | null;
  years_of_experience: number;
  bio: string;
  consultation_fee: number;
  department_id: number | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Shared select columns ─────────────────────────────────────────────────────
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
  years_of_experience: number;
  bio: string;
  consultation_fee: number;
  department_id?: number;
}, trx?: Knex.Transaction) => {
  const query = trx ? trx('doctors') : db('doctors');
  const [doctor] = await query.insert(data).returning('*');
  return doctor;
};

// ─── Find by doctors.id (PK) ───────────────────────────────────────────────────
export const findById = async (id: number, trx?: Knex.Transaction) => {
  const doctor = await withDepartment(trx).where('d.id', id).first();
  if (doctor) {
    const query = trx ? trx('users') : db('users');
    const user = await query.where('id', doctor.user_id).first();
    doctor.user = user;
  }
  return doctor;
};

// ─── Find by user_id (FK to users table) ──────────────────────────────────────
export const findByUserId = async (userId: number, trx?: Knex.Transaction) => {
  return withDepartment(trx).where('d.user_id', userId).first();
};

// ─── Update by user_id ─────────────────────────────────────────────────────────
export const updateByUserId = async (userId: number, data: UpdateDoctorInput, trx?: Knex.Transaction) => {
  const query = trx ? trx('doctors') : db('doctors');
  const [updated] = await query
    .where({ user_id: userId })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');

  return updated;
};

// ─── Get All Doctors (with department details) ─────────────────────────────────
export const getAllDoctors = async (filters: { specialization?: string; name?: string } = {}) => {
  const query = withDepartment().leftJoin('users as u', 'd.user_id', 'u.id');

  if (filters.specialization) {
    query.where("d.specialization", "ilike", `%${filters.specialization}%`);
  }
  
  if (filters.name) {
    query.where("u.full_name", "ilike", `%${filters.name}%`);
  }

  return query.orderBy('d.id', 'asc');
};

