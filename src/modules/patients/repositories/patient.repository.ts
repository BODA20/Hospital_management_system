import db from '../../../config/db';
import type { Knex } from 'knex';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PaginationParams,
  PatientProfile,
} from '../patient.types';

// ─── Shared enriched select ────────────────────────────────────────────────────
// Always JOINs users table so every query returns the full patient profile.
// Filters u.role = 'patient' to exclude promoted staff members.
const patientWithUser = () =>
  db('patients as p')
    .join('users as u', 'p.user_id', 'u.id')
    .where('u.role', 'patient')
    .select(
      'p.id',
      'p.user_id',
      'p.date_of_birth',
      db.raw('COALESCE(p.phone, u.phone) as phone'),
      'p.gender',
      'p.blood_group',
      'p.emergency_contact',
      'p.created_at',
      'p.updated_at',
      // From users (eager-loaded)
      'u.full_name',
      'u.email',
      'u.is_active',
      'u.role',
    );

// ─── Create Patient ────────────────────────────────────────────────────────────
export const createPatient = async (data: CreatePatientInput) => {
  // Step 1: upsert the full_name, email & phone onto the users row.
  // Cast to 'any' to bypass the Knex typed table which predates the full_name column.
  await (db('users') as any).where({ id: data.user_id }).update({
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
  });

  // Step 2: insert the patient profile row
  const [patient] = await db('patients')
    .insert({
      user_id: data.user_id,
      date_of_birth: data.date_of_birth,
      phone: data.phone,
      gender: data.gender,
      blood_group: data.blood_group,
      emergency_contact: data.emergency_contact,
    })
    .returning('*');

  return patient;
};

// ─── Create Base Patient ───────────────────────────────────────────────────────
export const createBasePatient = async (userId: number, trx?: Knex.Transaction) => {
  const knex = trx ?? db;
  const user = await knex('users').where({ id: userId }).select('phone').first();
  const phone = user?.phone && user.phone !== 'NOT_PROVIDED' ? user.phone : null;
  const query = trx ? trx('patients') : db('patients');
  const [patient] = await query.insert({ user_id: userId, phone }).returning('*');
  return patient;
};

// ─── Delete By User ID ─────────────────────────────────────────────────────────
export const deleteByUserId = async (userId: number, trx?: Knex.Transaction) => {
  const query = trx ? trx('patients') : db('patients');
  return query.where({ user_id: userId }).delete();
};

// ─── Find All with Pagination + Search ────────────────────────────────────────
export const findAll = async ({
  page,
  limit,
  search,
}: PaginationParams): Promise<{ data: PatientProfile[]; total: number }> => {
  const offset = (page - 1) * limit;

  const query = patientWithUser();

  if (search) {
    // Search by full_name OR phone (case-insensitive)
    query.where(function () {
      this.whereILike('u.full_name', `%${search}%`).orWhereILike(
        'p.phone',
        `%${search}%`,
      );
    });
  }

  // Total count (same filters, no pagination)
  const totalQuery = db('patients as p')
    .join('users as u', 'p.user_id', 'u.id')
    .where('u.role', 'patient')
    .count('p.id as count');

  if (search) {
    totalQuery.where(function () {
      this.whereILike('u.full_name', `%${search}%`).orWhereILike(
        'p.phone',
        `%${search}%`,
      );
    });
  }

  const [{ count }] = await totalQuery;
  const total = Number(count);

  const data = await query.orderBy('u.full_name', 'asc').limit(limit).offset(offset);

  return { data, total };
};

// ─── Find by ID ────────────────────────────────────────────────────────────────
export const findById = async (id: number) => {
  return patientWithUser().where('p.id', id).first();
};

// ─── Find by user_id (for "my profile" endpoint) ──────────────────────────────
export const findByUserId = async (userId: number) => {
  return patientWithUser().where('p.user_id', userId).first();
};

// ─── Find by email (uniqueness check) ─────────────────────────────────────────
export const findByEmail = async (email: string): Promise<any> => {
  return (db('users') as any).whereILike('email', email).first();
};

// ─── Find by phone (uniqueness check) ─────────────────────────────────────────
export const findByPhone = async (phone: string) => {
  return db('patients').where({ phone }).first();
};

// ─── Update Patient ────────────────────────────────────────────────────────────
export const updatePatient = async (id: number, data: UpdatePatientInput) => {
  const [updated] = await db('patients')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');

  return updated;
};

// ─── Delete Patient ────────────────────────────────────────────────────────────
export const deletePatient = async (id: number) => {
  return db('patients').where({ id }).delete();
};

// ─── Task 2: Get All Appointments for a Patient ────────────────────────────────
// Joins appointments → doctors → users to enrich with doctor name.
export const getPatientAppointments = async (patientId: number) => {
  return db('appointments as a')
    .join('doctors as d', 'a.doctor_id', 'd.id')
    .join('users as du', 'd.user_id', 'du.id')
    .join('departments as dept', 'd.department_id', 'dept.id')
    .where('a.patient_id', patientId)
    .orderBy('a.starts_at', 'desc')
    .select(
      'a.id',
      'a.starts_at',
      'a.ends_at',
      'a.status',
      'a.notes',
      'a.doctor_id',
      'du.full_name as doctor_name',
      'dept.name_en as department_name'
    );
};

export const getPatientMedicalRecords = async (userId: number) => {
  const patient = await findByUserId(userId);
  if (!patient) return [];

  const visits = await db('visits as v')
    .leftJoin('doctors as d', 'v.doctor_id', 'd.id')
    .leftJoin('users as du', 'd.user_id', 'du.id')
    .leftJoin('departments as dept', 'v.department_id', 'dept.id')
    .where('v.patient_id', patient.id)
    .orderBy('v.created_at', 'desc')
    .select(
      'v.id',
      'v.diagnosis',
      'v.treatment_plan',
      'v.notes',
      'v.vitals',
      'v.status',
      'v.check_in_at as visit_date',
      'v.created_at',
      'v.doctor_id',
      db.raw("COALESCE(du.full_name, 'Doctor #' || v.doctor_id::text) as doctor_name"),
      'd.specialization as doctor_specialization',
      'dept.name_en as department_name'
    );

  return visits;
};

