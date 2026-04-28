import db from '../../../config/db';
import type { CreateVisitInput, UpdateVisitInput } from '../visit.types';
import type { Knex } from 'knex';

// ─── Shared enriched select ────────────────────────────────────────────────────
// Joins patients → users (patient name), doctors → users (doctor name), departments.
const visitWithDetails = () =>
  db('visits as v')
    .join('patients as p', 'v.patient_id', 'p.id')
    .join('users as pu', 'p.user_id', 'pu.id')
    .join('doctors as d', 'v.doctor_id', 'd.id')
    .join('users as du', 'd.user_id', 'du.id')
    .leftJoin('departments as dept', 'v.department_id', 'dept.id')
    .select(
      'v.id',
      'v.patient_id',
      'v.doctor_id',
      'v.appointment_id',
      'v.department_id',
      'v.status',
      'v.check_in_at',
      'v.check_out_at',
      'v.chief_complaint',
      'v.diagnosis',
      'v.treatment_plan',
      'v.notes',
      'v.vitals',
      'v.created_at',
      'v.updated_at',
      // Patient
      'pu.full_name as patient_name',
      'pu.email as patient_email',
      // Doctor
      'du.full_name as doctor_name',
      // Department
      'dept.name as department_name',
    );

// ─── Create Visit ──────────────────────────────────────────────────────────────
export const createVisit = async (data: CreateVisitInput) => {
  const [visit] = await db('visits')
    .insert({
      patient_id: data.patient_id,
      doctor_id: data.doctor_id,
      appointment_id: data.appointment_id ?? null,
      chief_complaint: data.reason_for_visit, // request field → DB column name
      diagnosis: data.diagnosis,
      treatment_plan: data.treatment_plan ?? null,
      notes: data.notes ?? null,
      vitals: data.vitals ? JSON.stringify(data.vitals) : null,
      check_in_at: data.check_in_at ?? db.fn.now(),
      status: 'awaiting_vitals',  // nurse must record vitals before doctor sees patient
    })
    .returning('*');

  return visit;
};

// ─── Get Patient History ───────────────────────────────────────────────────────
// All visits for a patient, joined with doctor name — ordered latest first.
export const getPatientHistory = async (patientId: number) => {
  return visitWithDetails()
    .where('v.patient_id', patientId)
    .orderBy('v.check_in_at', 'desc');
};

// ─── Get Visit Details (single) ────────────────────────────────────────────────
// Full detail with patient + doctor joined.
export const getVisitDetails = async (id: number) => {
  return visitWithDetails().where('v.id', id).first();
};

// ─── Get All Visits ────────────────────────────────────────────────────────────
export const getAllVisits = async () => {
  return visitWithDetails().orderBy('v.check_in_at', 'desc');
};

// ─── Get Visits by Doctor ──────────────────────────────────────────────────────
export const getVisitsByDoctor = async (doctorId: number) => {
  return visitWithDetails()
    .where('v.doctor_id', doctorId)
    .orderBy('v.check_in_at', 'desc');
};

// ─── Update Visit ──────────────────────────────────────────────────────────────
export const updateVisit = async (id: number, data: UpdateVisitInput, trx?: Knex.Transaction) => {
  const query = trx ? trx('visits') : db('visits');
  const updatePayload: Record<string, any> = {
    ...data,
    updated_at: db.fn.now(),
  };

  // Serialize vitals if provided
  if (data.vitals) {
    updatePayload.vitals = JSON.stringify(data.vitals);
  }

  const [updated] = await query
    .where({ id })
    .update(updatePayload)
    .returning('*');

  return updated;
};

// ─── Find raw visit by ID (for existence/ownership checks) ─────────────────────
export const findRawById = async (id: number) => {
  return db('visits').where({ id }).first();
};

// ─── Record Vitals (nurse action) ──────────────────────────────────────────────────
// Saves vitals, records the nurse who took them, and flips status to ready_for_doctor.
export const recordVitals = async (
  id: number,
  vitals: object,
  nurseId: number,
) => {
  const [updated] = await db('visits')
    .where({ id })
    .update({
      vitals: JSON.stringify(vitals),
      nurse_id: nurseId,
      status: 'ready_for_doctor',
      updated_at: db.fn.now(),
    })
    .returning('*');
  return updated;
};

// ─── Get Pending Visits for Doctor (status = ready_for_doctor) ───────────────────
// Doctor dashboard query: fetches visits waiting for a specific doctor, ordered
// by check-in time (earliest first — longest waiting patients first).
export const getPendingVisitsForDoctor = async (doctorId: number) => {
  return visitWithDetails()
    .where('v.status', 'ready_for_doctor')
    .andWhere('v.doctor_id', doctorId)
    .orderBy('v.check_in_at', 'asc');
};
