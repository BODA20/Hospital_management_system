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
      'dept.name_en as department_name',
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

export const getBookedSlotsForDoctor = async (doctorId: number, dateStr: string): Promise<string[]> => {
  // Exclude cancelled AND no_show to stay consistent with checkAvailability.
  // Use both appointment_date and a UTC-safe DATE(starts_at) fallback so that
  // cross-channel bookings (online patient vs walk-in) are never missed.
  const appointments = await db('appointments')
    .where('doctor_id', doctorId)
    .whereNotIn('status', ['cancelled', 'no_show'])
    .andWhere(function () {
      this.where('appointment_date', dateStr)
        .orWhereRaw("DATE(starts_at AT TIME ZONE 'UTC') = ?", [dateStr]);
    })
    .select('time_slot', 'starts_at');

  const booked: string[] = [];
  for (const appt of appointments) {
    if (appt.time_slot) {
      // Always take only the start part (handles "09:30" and "09:30 - 10:00")
      const startTime = appt.time_slot.split('-')[0].trim().slice(0, 5);
      booked.push(startTime);
    } else if (appt.starts_at) {
      // Use UTC to avoid local-timezone shifts on the Node.js server
      const d = new Date(appt.starts_at);
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      booked.push(`${h}:${m}`);
    }
  }
  return booked;
};


