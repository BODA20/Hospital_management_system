import db from '../../../config/db';

const DEFAULT_DURATION_MINUTES = 30;

// ─── Check Availability ────────────────────────────────────────────────────────
export const checkAvailability = async (
  doctorId: number,
  startsAt: Date | string,
): Promise<boolean> => {
  const startTime = new Date(startsAt);
  const endTime = new Date(
    startTime.getTime() + DEFAULT_DURATION_MINUTES * 60_000,
  );

  const overlapping = await db('appointments')
    .where('doctor_id', doctorId)
    .whereIn('status', ['scheduled'])
    .andWhere(function () {
      this.where('starts_at', '<', endTime).andWhere('ends_at', '>', startTime);
    })
    .first();

  return !overlapping;
};

// ─── Create Appointment ────────────────────────────────────────────────────────
export const createAppointment = async (data: {
  patient_id: number;
  doctor_id: number;
  starts_at: Date | string;
  status: string;
  notes?: string;
}) => {
  const startTime = new Date(data.starts_at);
  const endTime = new Date(
    startTime.getTime() + DEFAULT_DURATION_MINUTES * 60_000,
  );

  const [appointment] = await db('appointments')
    .insert({
      ...data,
      ends_at: endTime,
    })
    .returning('*');

  return appointment;
};

// ─── Find by ID ────────────────────────────────────────────────────────────────
export const findById = (id: number) => {
  return db('appointments').where({ id }).first();
};

// ─── Get by Patient ────────────────────────────────────────────────────────────
export const getByPatient = (patientId: number) => {
  return db('appointments')
    .where({ patient_id: patientId })
    .orderBy('starts_at', 'desc');
};

// ─── Get by Doctor (all appointments) ─────────────────────────────────────────
export const getByDoctor = (doctorId: number) => {
  return db('appointments')
    .where({ doctor_id: doctorId })
    .orderBy('starts_at', 'asc');
};

// ─── Get Doctor Daily Schedule ─────────────────────────────────────────────────
// Returns today's appointments (current time → midnight) with patient details.
export const getDoctorDailySchedule = (doctorId: number, date: Date) => {
  // Build start-of-day and end-of-day boundaries in UTC
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .join('users as u', 'p.user_id', 'u.id')
    .where('a.doctor_id', doctorId)
    .whereBetween('a.starts_at', [startOfDay, endOfDay])
    .whereIn('a.status', ['scheduled', 'completed'])
    .orderBy('a.starts_at', 'asc')
    .select(
      'a.id',
      'a.starts_at',
      'a.ends_at',
      'a.status',
      'a.notes',
      'p.id as patient_id',
      'u.full_name as patient_name',
      'u.email as patient_email',
      'u.phone as patient_phone',
    );
};

// ─── Update Status ─────────────────────────────────────────────────────────────
export const updateStatus = (id: number, status: string) => {
  return db('appointments')
    .where({ id })
    .update({
      status,
      updated_at: db.fn.now(),
    })
    .returning('*');
};
