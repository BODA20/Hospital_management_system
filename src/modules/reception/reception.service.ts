import db from '../../config/db';
import { appError } from '../../common/errors/AppError';
import { checkAvailability } from '../appointments/repositories/appo.repo';
import crypto from 'crypto';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface QuickPatientInput {
  full_name: string;
  phone: string;
  national_id?: string;
}

export interface WalkInBookingInput {
  patient_id?: number;          // provide this OR full_name+phone
  full_name?: string;           // used when patient_id is not known
  phone?: string;               // used when patient_id is not known
  doctor_id: number;
  appointment_date: string;     // YYYY-MM-DD
  time_slot?: string;
  payment_status?: 'unpaid' | 'paid_cash' | 'paid_online';
}

// ─── Patient Search ─────────────────────────────────────────────────────────────
// Fuzzy search across users.full_name, users.phone for walk-in typeahead.
// Strictly returns users where users.role = 'patient' (excludes doctor, nurse, receptionist, admin).
export const searchPatients = async (query?: string) => {
  const clean = String(query ?? '').trim();
  if (!clean || clean.length < 2) {
    const rows = await db.raw<{ rows: any[] }>(
      `SELECT
         p.id          AS patient_id,
         u.id          AS user_id,
         u.full_name,
         u.phone
       FROM patients p
       JOIN users u ON u.id = p.user_id
       WHERE u.role = 'patient'
       ORDER BY p.id DESC
       LIMIT 15`,
    );
    return rows.rows ?? [];
  }

  const term = `%${clean}%`;

  const rows = await db.raw<{ rows: any[] }>(
    `SELECT
       p.id          AS patient_id,
       u.id          AS user_id,
       u.full_name,
       u.phone
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE
       u.role = 'patient'
       AND (
         u.full_name ILIKE ?
         OR u.phone   ILIKE ?
       )
     ORDER BY u.full_name
     LIMIT 15`,
    [term, term],
  );

  return rows.rows ?? [];
};

// ─── Quick Patient Registration ─────────────────────────────────────────────────
// Creates a user + patient profile without requiring email OTP verification.
// Used exclusively by the receptionist for walk-in patients.
export const registerPatient = async (data: QuickPatientInput) => {
  const { full_name, phone, national_id } = data;

  if (!full_name || !phone) {
    throw new appError('full_name and phone are required', 400);
  }

  // Check if a user with this phone already exists
  const existingResult = await db.raw(
    `SELECT u.id, u.full_name, u.phone, u.role, u.is_verified FROM users u WHERE u.phone = ? LIMIT 1`,
    [phone],
  );
  const existingUser = existingResult.rows?.[0] ?? null;

  if (existingUser) {
    if (existingUser.role !== 'patient') {
      throw new appError(`User with phone ${phone} is registered as staff (${existingUser.role}) and cannot be registered as a walk-in patient.`, 400);
    }
    // Update full_name if provided and different from stored placeholder
    if (full_name && full_name.trim() !== '' && existingUser.full_name !== full_name.trim()) {
      await db('users').where({ id: existingUser.id }).update({ full_name: full_name.trim() } as any);
      existingUser.full_name = full_name.trim();
    }
    const existingPatient = await db('patients').where({ user_id: existingUser.id }).first();
    if (existingPatient) {
      return {
        user: existingUser,
        patient: existingPatient,
        already_existed: true,
      };
    }
  }

  // Generate a placeholder email so the UNIQUE constraint on users.email is met
  const placeholderEmail = `walkin_${Date.now()}_${Math.floor(Math.random() * 9999)}@hospital.internal`;

  // Generate a random placeholder password hash (patient will never log in with this)
  const randomPwd = crypto.randomBytes(32).toString('hex');
  const invalidHash = `$invalid$${randomPwd}`;

  return await db.transaction(async (trx) => {
    const userResult = await trx.raw(
      `INSERT INTO users (full_name, email, phone, password_hash, role, is_verified, is_active)
       VALUES (?, ?, ?, ?, 'patient', true, true)
       RETURNING id, full_name, email, phone, role, is_verified`,
      [full_name, placeholderEmail, phone, invalidHash],
    );
    const user = userResult.rows[0];

    const patientResult = await trx.raw(
      `INSERT INTO patients (user_id, phone)
       VALUES (?, ?)
       RETURNING *`,
      [user.id, phone],
    );
    const patient = patientResult.rows[0];

    return {
      user,
      patient,
      already_existed: false,
    };
  });
};

// ─── Walk-In Booking ────────────────────────────────────────────────────────────
// Books a walk-in appointment and assigns the next queue number for that doctor + date.
// SLOT_DURATION_MINUTES: each walk-in slot is 30 minutes (no schedule columns on doctors table).
const SLOT_DURATION_MINUTES = 30;

export const bookWalkIn = async (data: WalkInBookingInput) => {
  let {
    patient_id,
    full_name,
    phone,
    doctor_id,
    appointment_date,
    time_slot,
    payment_status = 'paid_cash',
  } = data;

  // ── Auto-register or locate patient if patient_id was not directly supplied ──
  if ((!patient_id || isNaN(Number(patient_id))) && full_name && phone) {
    const regResult = await registerPatient({ full_name, phone });
    patient_id = regResult.patient.id;
  }

  if (!patient_id) {
    throw new appError('Provide either patient_id or both full_name and phone to identify the patient.', 400);
  }

  // ── Normalize appointment_date (e.g., MM/DD/YYYY → YYYY-MM-DD) ─────────────
  let normalizedDate = appointment_date;
  if (appointment_date && appointment_date.includes('/')) {
    const parts = appointment_date.split('/');
    if (parts[0].length === 4) {
      normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      normalizedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }

  const patient = await db('patients').where({ id: patient_id }).first();
  if (!patient) {
    throw new appError(`Patient with ID ${patient_id} not found`, 404);
  }

  const doctor = await db('doctors').where({ id: doctor_id }).first();
  if (!doctor) {
    throw new appError(`Doctor with ID ${doctor_id} not found`, 404);
  }

  return await db.transaction(async (trx) => {
    // ── Atomically compute next queue number ─────────────────────────
    // COALESCE ensures we get 0 on an empty day so queueNumber = 1.
    const qResult = await trx.raw<{ rows: { next_q: string }[] }>(
      `SELECT COALESCE(MAX(queue_number), 0) + 1 AS next_q
         FROM appointments
        WHERE doctor_id = ?
          AND (
                appointment_date = ?
             OR DATE(starts_at AT TIME ZONE 'UTC') = ?
              )
          AND status NOT IN ('cancelled', 'no_show')`,
      [doctor_id, normalizedDate, normalizedDate],
    );
    const queueNumber = Number(qResult.rows[0]?.next_q ?? 1);

    // ── Build starts_at / ends_at (ends_at is NOT NULL in DB) ────────
    // Default start time is determined by the doctor's shift:
    //   Morning → 08:00,  Night → 16:00
    // This ensures a walk-in with no chosen slot still lands in the right window.
    let defaultStartHH = '08';
    if (!time_slot) {
      const shiftRow = await trx('users')
        .join('doctors as d', 'd.user_id', 'users.id')
        .where('d.id', doctor_id)
        .select('users.assigned_shift')
        .first();
      defaultStartHH = shiftRow?.assigned_shift === 'Night' ? '16' : '08';
    }

    const timeStr = time_slot
      ? (time_slot.length === 5 ? `${time_slot}:00` : time_slot)   // HH:mm → HH:mm:ss
      : `${defaultStartHH}:00:00`;
    const startsAt = new Date(`${normalizedDate}T${timeStr}`);
    const endsAt   = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

    if (isNaN(startsAt.getTime())) {
      throw new appError(`Invalid appointment date/time: ${normalizedDate} ${timeStr}`, 400);
    }

    const formattedSlot = time_slot ? time_slot.slice(0, 5) : `${defaultStartHH}:00`;
    const isAvailable = await checkAvailability(doctor_id, startsAt, normalizedDate, formattedSlot);
    if (!isAvailable) {
      throw new appError(`This time slot (${formattedSlot}) has already been reserved for the selected doctor. Please select another slot.`, 409);
    }

    let appointment: any;
    try {
      [appointment] = await trx('appointments')
        .insert({
          patient_id,
          doctor_id,
          appointment_date: normalizedDate,
          time_slot:      time_slot ? time_slot.slice(0, 5) : `${defaultStartHH}:00`,
          starts_at:      startsAt,
          ends_at:        endsAt,           // ← was missing → caused NOT NULL violation
          queue_number:   queueNumber,
          booking_source: 'walk_in',
          payment_status,
          status:         'confirmed',       // skip the exclusion constraint (only covers 'scheduled')
        })
        .returning('*');
    } catch (dbErr: any) {
      // Surface the exact Postgres error so it appears in the server log
      console.error('[bookWalkIn] DB INSERT ERROR:', dbErr?.message, dbErr?.detail, dbErr?.hint);
      throw new appError(
        `Failed to create appointment: ${dbErr?.detail ?? dbErr?.message ?? 'unknown DB error'}`,
        500,
      );
    }

    return {
      appointment,
      queue_number: queueNumber,
    };
  });
};

// ─── Get Booked Slots for a Doctor on a Date ────────────────────────────────────
// Returns already-taken time_slot values AND the doctor's shift so the frontend
// can generate the correct window (Morning: 08-16, Night: 16-24).
export const getBookedSlots = async (
  doctorId: number,
  date: string,
): Promise<{ bookedSlots: string[]; shift: string }> => {
  // Fetch booked slots – query BOTH appointment_date (explicit) and a UTC-safe
  // DATE(starts_at) fallback so cross-channel bookings from the patient app and
  // the reception walk-in desk are both included.
  const rows = await db('appointments')
    .where('doctor_id', doctorId)
    .whereNotIn('status', ['cancelled', 'no_show'])
    .whereNotNull('time_slot')
    .andWhere(function () {
      this.where('appointment_date', date)
        .orWhereRaw("DATE(starts_at AT TIME ZONE 'UTC') = ?", [date]);
    })
    .pluck('time_slot');

  // Fetch the doctor's assigned shift from users table
  const doctorRow = await db('doctors as d')
    .join('users as u', 'u.id', 'd.user_id')
    .where('d.id', doctorId)
    .select('u.assigned_shift')
    .first();

  const shift = doctorRow?.assigned_shift ?? 'Morning';

  // Normalise slots to HH:mm so the frontend can compare uniformly
  const bookedSlots = (rows as string[]).map((s) => s.slice(0, 5));

  return { bookedSlots, shift };
};

// ─── Today's Queue Board ────────────────────────────────────────────────────────
// Returns ALL today's appointments (both walk_in and online) for every doctor,
// ordered by queue_number / time_slot within each doctor's list.
export const getTodayQueue = async (dateParam?: string) => {
  let targetDate = dateParam;

  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localNow = new Date(now.getTime() - offsetMs);
    targetDate = localNow.toISOString().split('T')[0];
  }

  const appointments = await db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .join('users as pu', 'p.user_id', 'pu.id')
    .join('doctors as d', 'a.doctor_id', 'd.id')
    .join('users as du', 'd.user_id', 'du.id')
    .leftJoin('departments as dept', 'd.department_id', 'dept.id')
    .where(function () {
      this.where('a.appointment_date', targetDate)
        .orWhereRaw("TO_CHAR(a.appointment_date, 'YYYY-MM-DD') = ?", [targetDate])
        .orWhereRaw("TO_CHAR(a.starts_at, 'YYYY-MM-DD') = ?", [targetDate])
        .orWhereRaw("DATE(a.starts_at) = ?", [targetDate])
        .orWhereRaw("DATE(a.starts_at AT TIME ZONE 'UTC') = ?", [targetDate])
        .orWhereRaw("DATE(a.appointment_date AT TIME ZONE 'UTC') = ?", [targetDate]);
    })
    .where('du.role', 'doctor')
    .whereRaw("LOWER(a.status::text) NOT IN ('cancelled', 'no_show', 'rejected', 'missed')")
    .orderByRaw('d.id, COALESCE(a.queue_number, 9999), a.starts_at, a.time_slot')
    .select(
      'a.id',
      'a.queue_number',
      'a.status',
      'a.queue_status',
      'a.booking_source',
      'a.payment_status',
      'a.appointment_date',
      'a.time_slot',
      'a.starts_at',
      'a.patient_id',
      'a.doctor_id',
      'pu.full_name as patient_name',
      'pu.phone as patient_phone',
      'du.full_name as doctor_name',
      'd.specialization as doctor_specialization',
      'dept.name_en as department_name',
    );

  // Group by doctor (pre-populate with active doctors so all doctor cards render)
  const doctorMap = new Map<number, any>();

  const activeDoctors = await db('doctors as d')
    .join('users as u', 'd.user_id', 'u.id')
    .leftJoin('departments as dept', 'd.department_id', 'dept.id')
    .where('u.is_active', true)
    .where('u.role', 'doctor')
    .select(
      'd.id as doctor_id',
      'u.full_name as doctor_name',
      'd.specialization as doctor_specialization',
      'dept.name_en as department_name',
    );

  for (const doc of activeDoctors) {
    doctorMap.set(doc.doctor_id, {
      doctor_id: doc.doctor_id,
      doctor_name: doc.doctor_name,
      doctor_specialization: doc.doctor_specialization,
      department_name: doc.department_name,
      current_serving: null,
      appointments: [],
    });
  }

  for (const appt of appointments) {
    if (!doctorMap.has(appt.doctor_id)) {
      doctorMap.set(appt.doctor_id, {
        doctor_id: appt.doctor_id,
        doctor_name: appt.doctor_name,
        doctor_specialization: appt.doctor_specialization,
        department_name: appt.department_name,
        current_serving: null,
        appointments: [],
      });
    }

    const docQueue = doctorMap.get(appt.doctor_id)!;
    if (appt.status === 'with_nurse' || appt.status === 'in_consultation') {
      docQueue.current_serving = appt.queue_number ?? docQueue.current_serving;
    }
    docQueue.appointments.push(appt);
  }

  return Array.from(doctorMap.values());
};

// ─── Update Payment Status ──────────────────────────────────────────────────────
export const markAppointmentPaid = async (
  appointmentId: number,
  paymentStatus: 'paid_cash' | 'paid_online',
) => {
  const [updated] = await db('appointments')
    .where({ id: appointmentId })
    .update({ payment_status: paymentStatus })
    .returning(['id', 'payment_status', 'status']);

  if (!updated) throw new appError(`Appointment #${appointmentId} not found`, 404);
  return updated;
};

// ─── Check-In: Mark Patient Arrived ────────────────────────────────────────────
// Transitions the appointment to 'confirmed' status and sets queue_status='arrived'
// so the nurse queue can identify physically-present patients.
// We intentionally preserve booking_source to retain the online/walk_in origin tag.
export const checkInAppointment = async (appointmentId: number) => {
  const appt = await db('appointments').where({ id: appointmentId }).first();
  if (!appt) throw new appError(`Appointment #${appointmentId} not found`, 404);

  if (['completed', 'cancelled', 'no_show'].includes(appt.status)) {
    throw new appError('Cannot check in a completed or cancelled appointment', 400);
  }

  if (appt.queue_status === 'arrived') {
    throw new appError('Patient has already been checked in', 409);
  }

  const [updated] = await db('appointments')
    .where({ id: appointmentId })
    .update({
      // Advance pending → confirmed so the nurse queue picks it up
      status: appt.status === 'pending' ? 'confirmed' : appt.status,
      // Mark physical presence without touching booking_source
      queue_status: 'arrived',
      updated_at: db.fn.now(),
    })
    .returning(['id', 'status', 'queue_status', 'booking_source', 'queue_number']);

  return updated;
};

// ─── Get Available Doctors ──────────────────────────────────────────────────
export const getDoctors = async () => {
  return db('doctors as d')
    .join('users as u', 'd.user_id', 'u.id')
    .leftJoin('departments as dept', 'd.department_id', 'dept.id')
    .where('u.is_active', true)
    .where('u.role', 'doctor')
    .select(
      'd.id',
      'u.full_name as name',
      'd.specialization',
      'dept.name_en as department_name',
      'd.consultation_fee',
      'u.assigned_shift',   // ← Morning | Night — drives slot generation in the frontend
    )
    .orderBy('u.full_name', 'asc');
};
