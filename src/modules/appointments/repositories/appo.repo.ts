import db from '../../../config/db';

const DEFAULT_DURATION_MINUTES = 30;

// ─── Check Availability & Double Booking Guard ──────────────────────────────
export const checkAvailability = async (
  doctorId: number,
  startsAt: Date | string,
  appointmentDate?: string | null,
  timeSlot?: string | null,
  excludeAppointmentId?: number,
): Promise<boolean> => {
  const startTime = new Date(startsAt);
  const endTime = new Date(
    startTime.getTime() + DEFAULT_DURATION_MINUTES * 60_000,
  );

  const query = db('appointments')
    .where('doctor_id', doctorId)
    .whereNotIn('status', ['cancelled', 'no_show'])
    .andWhere(function () {
      // 1. Exact match on date & time slot
      if (appointmentDate && timeSlot) {
        this.where(function () {
          this.where({ appointment_date: appointmentDate, time_slot: timeSlot })
            .orWhere(function () {
              this.where('starts_at', '<', endTime).andWhere('ends_at', '>', startTime);
            });
        });
      } else {
        // 2. Overlapping datetime range
        this.where('starts_at', '<', endTime).andWhere('ends_at', '>', startTime);
      }
    });

  if (excludeAppointmentId) {
    query.whereNot('id', excludeAppointmentId);
  }

  const overlapping = await query.first();
  return !overlapping;
};

// ─── Create Appointment ────────────────────────────────────────────────────────
export const createAppointment = async (data: {
  patient_id: number;
  doctor_id: number;
  department_id?: number | null;
  appointment_date?: string | null;
  time_slot?: string | null;
  starts_at: Date | string;
  ends_at: Date | string;
  status: string;
  booking_source?: string;
  reason?: string | null;
  notes?: string | null;
}) => {
  const [appointment] = await db('appointments')
    .insert(data)
    .returning('*');

  return appointment;
};

export interface FormattedVitals {
  blood_pressure: string | null;
  heart_rate: number | null;
  temperature: number | null;
  weight: number | null;
  respiratory_rate: number | null;
  logged_at: string | null;
  notes?: string | null;
  bp?: string | null;
  pulse?: number | null;
}

export const resolveVitalsForRecord = async (
  patientId: number,
  visitVitalsRaw?: any,
): Promise<FormattedVitals | null> => {
  let parsedVitals: any = null;
  if (visitVitalsRaw) {
    try {
      parsedVitals =
        typeof visitVitalsRaw === 'string'
          ? JSON.parse(visitVitalsRaw)
          : visitVitalsRaw;
    } catch {
      parsedVitals = null;
    }
  }

  if (!parsedVitals && patientId) {
    const pv = await db('patient_vitals')
      .where({ patient_id: patientId })
      .orderBy('created_at', 'desc')
      .first();

    if (pv) {
      const bpStr =
        pv.blood_pressure_sys && pv.blood_pressure_dia
          ? `${pv.blood_pressure_sys}/${pv.blood_pressure_dia}`
          : pv.blood_pressure || null;
      return {
        blood_pressure: bpStr,
        bp: bpStr,
        heart_rate: pv.heart_rate != null ? Number(pv.heart_rate) : null,
        pulse: pv.heart_rate != null ? Number(pv.heart_rate) : null,
        temperature: pv.temperature != null ? Number(pv.temperature) : null,
        weight: pv.weight != null ? Number(pv.weight) : null,
        respiratory_rate:
          pv.respiratory_rate != null ? Number(pv.respiratory_rate) : null,
        logged_at: pv.created_at || pv.updated_at || null,
        notes: pv.notes || null,
      };
    }
    return null;
  }

  if (parsedVitals) {
    const bpStr =
      parsedVitals.blood_pressure ||
      parsedVitals.bp ||
      (parsedVitals.blood_pressure_sys && parsedVitals.blood_pressure_dia
        ? `${parsedVitals.blood_pressure_sys}/${parsedVitals.blood_pressure_dia}`
        : null);

    const hrNum =
      parsedVitals.heart_rate != null
        ? Number(parsedVitals.heart_rate)
        : parsedVitals.pulse != null
        ? Number(parsedVitals.pulse)
        : null;

    const tempNum =
      parsedVitals.temperature != null
        ? Number(parsedVitals.temperature)
        : null;

    const respNum =
      parsedVitals.respiratory_rate != null
        ? Number(parsedVitals.respiratory_rate)
        : null;

    const loggedAt =
      parsedVitals.logged_at ||
      parsedVitals.created_at ||
      parsedVitals.updated_at ||
      new Date().toISOString();

    return {
      blood_pressure: bpStr,
      bp: bpStr,
      heart_rate: hrNum,
      pulse: hrNum,
      temperature: tempNum,
      weight: parsedVitals.weight != null ? Number(parsedVitals.weight) : null,
      respiratory_rate: respNum,
      logged_at: loggedAt,
      notes: parsedVitals.notes || null,
    };
  }

  return null;
};

// ─── Find by ID ────────────────────────────────────────────────────────────────
export const findById = async (id: number) => {
  const appointment = await db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .join('users as pu', 'p.user_id', 'pu.id')
    .join('doctors as d', 'a.doctor_id', 'd.id')
    .join('users as du', 'd.user_id', 'du.id')
    .leftJoin('departments as dept', 'a.department_id', 'dept.id')
    .leftJoin('visits as v', 'a.id', 'v.appointment_id')
    .where('a.id', id)
    .select(
      'a.*',
      'pu.full_name as patient_name',
      'pu.email as patient_email',
      'pu.phone as patient_phone',
      'du.full_name as doctor_name',
      'd.specialization as doctor_specialization',
      'dept.name as department_name',
      'v.id as visit_id',
      'v.status as visit_status',
      'v.vitals as visit_vitals_raw'
    )
    .first();

  if (!appointment) return null;

  const vitalsObj = await resolveVitalsForRecord(
    appointment.patient_id,
    appointment.visit_vitals_raw
  );

  return {
    ...appointment,
    vitals: vitalsObj,
    visit_vitals: vitalsObj ? JSON.stringify(vitalsObj) : null,
  };
};

// ─── Get by Patient ────────────────────────────────────────────────────────────
export const getByPatient = async (patientId: number) => {
  const appointments = await db('appointments as a')
    .join('doctors as d', 'a.doctor_id', 'd.id')
    .join('users as du', 'd.user_id', 'du.id')
    .leftJoin('departments as dept', 'a.department_id', 'dept.id')
    .leftJoin('visits as v', 'a.id', 'v.appointment_id')
    .where('a.patient_id', patientId)
    .orderBy('a.starts_at', 'desc')
    .select(
      'a.*',
      'du.full_name as doctor_name',
      'd.specialization as doctor_specialization',
      'dept.name as department_name',
      'v.id as visit_id',
      'v.status as visit_status',
      'v.vitals as visit_vitals_raw'
    );

  const enriched = await Promise.all(
    appointments.map(async (a) => {
      const vitalsObj = await resolveVitalsForRecord(a.patient_id, a.visit_vitals_raw);
      return {
        ...a,
        vitals: vitalsObj,
        visit_vitals: vitalsObj ? JSON.stringify(vitalsObj) : null,
      };
    })
  );

  return enriched;
};

export const getByDoctor = async (doctorId: number, date?: string) => {
  const query = db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .join('users as pu', 'p.user_id', 'pu.id')
    .leftJoin('departments as dept', 'a.department_id', 'dept.id')
    .leftJoin('visits as v', 'a.id', 'v.appointment_id')
    .where('a.doctor_id', doctorId)
    .whereNotIn('a.status', ['cancelled', 'no_show']);

  if (date) {
    query.andWhere(function () {
      this.whereRaw('a.appointment_date::date = ?', [date])
        .orWhereRaw("DATE(a.starts_at AT TIME ZONE 'UTC') = ?", [date]);
    });
  } else {
  query.andWhere(function () {
      this.whereRaw(
        "a.appointment_date = (NOW() AT TIME ZONE 'Africa/Cairo')::date"
      ).orWhereRaw(
        "DATE(a.starts_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date"
      );
    });
}

  const appointments = await query
    .orderBy('a.starts_at', 'asc')
    .select(
      'a.*',
      'pu.full_name as patient_name',
      'pu.email as patient_email',
      'pu.phone as patient_phone',
      'dept.name as department_name',
      'v.id as visit_id',
      'v.status as visit_status',
      'v.vitals as visit_vitals_raw'
    );

  const enriched = await Promise.all(
    appointments.map(async (a) => {
      const vitalsObj = await resolveVitalsForRecord(a.patient_id, a.visit_vitals_raw);
      return {
        ...a,
        vitals: vitalsObj,
        visit_vitals: vitalsObj ? JSON.stringify(vitalsObj) : null,
      };
    })
  );

  return enriched;
};

// ─── Get All Appointments (Admin Global Search & Filter) ──────────────────────
export const getAllAppointments = (filters: {
  status?: string;
  doctor_id?: number;
  patient_id?: number;
  department_id?: number;
  date?: string;
  search?: string;
}) => {
  const query = db('appointments as a')
    .leftJoin('patients as p', 'a.patient_id', 'p.id')
    .leftJoin('users as pu', 'p.user_id', 'pu.id')
    .leftJoin('doctors as d', 'a.doctor_id', 'd.id')
    .leftJoin('users as du', 'd.user_id', 'du.id')
    .leftJoin('departments as dept', 'a.department_id', 'dept.id')
    .groupBy('a.id', 'pu.id', 'du.id', 'dept.id', 'p.id', 'd.id')
    .orderByRaw('COALESCE(a.starts_at, a.created_at) DESC')
    .select(
      'a.*',
      'pu.full_name as patient_name',
      'pu.email as patient_email',
      'pu.phone as patient_phone',
      'du.full_name as doctor_name',
      'd.specialization as doctor_specialization',
      'dept.name_en as department_name'
    );

  if (filters.status && filters.status !== 'all') {
    query.where('a.status', filters.status);
  }
  if (filters.doctor_id) {
    query.where('a.doctor_id', filters.doctor_id);
  }
  if (filters.patient_id) {
    query.where('a.patient_id', filters.patient_id);
  }
  if (filters.department_id) {
    query.where('a.department_id', filters.department_id);
  }
  if (filters.date) {
    const dVal = filters.date;
    query.andWhere(function () {
      this.where('a.appointment_date', dVal)
        .orWhereRaw('DATE(a.starts_at) = ?', [dVal]);
    });
  }
  if (filters.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    query.andWhere(function () {
      this.whereRaw('LOWER(COALESCE(pu.full_name, \'\')) LIKE ?', [term])
        .orWhereRaw('LOWER(COALESCE(du.full_name, \'\')) LIKE ?', [term])
        .orWhereRaw('LOWER(COALESCE(pu.email, \'\')) LIKE ?', [term])
        .orWhereRaw('LOWER(COALESCE(a.reason, \'\')) LIKE ?', [term]);
    });
  }

  return query;
};

// ─── Get Doctor Daily Schedule ─────────────────────────────────────────────────
// NOTE: Date comparison is done in PostgreSQL using the Africa/Cairo timezone so
// that the "today" boundary is local midnight Cairo, not UTC midnight.  This
// mirrors the fix already applied to getByDoctor.
export const getDoctorDailySchedule = (doctorId: number) => {
  return db('appointments as a')
    .join('patients as p', 'a.patient_id', 'p.id')
    .join('users as pu', 'p.user_id', 'pu.id')
    .where('a.doctor_id', doctorId)
    .andWhere(function () {
      this
        .whereRaw("a.appointment_date = (NOW() AT TIME ZONE 'Africa/Cairo')::date")
        .orWhereRaw("DATE(a.starts_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date");
    })
    .whereIn('a.status', ['pending', 'scheduled', 'confirmed', 'in_progress', 'completed'])
    .orderBy('a.starts_at', 'asc')
    .select(
      'a.*',
      'p.id as patient_id',
      'pu.full_name as patient_name',
      'pu.email as patient_email',
      'pu.phone as patient_phone'
    );
};

// ─── Update Status ─────────────────────────────────────────────────────────────
export const updateStatus = (id: number, status: string, notes?: string | null) => {
  const updateData: any = {
    status,
    updated_at: db.fn.now(),
  };
  if (notes !== undefined) {
    updateData.notes = notes;
  }

  return db('appointments')
    .where({ id })
    .update(updateData)
    .returning('*');
};

// ─── Reschedule Appointment ────────────────────────────────────────────────────
export const reschedule = (
  id: number,
  data: {
    doctor_id?: number;
    appointment_date?: string;
    time_slot?: string;
    starts_at?: Date | string;
    ends_at?: Date | string;
    reason?: string;
  }
) => {
  return db('appointments')
    .where({ id })
    .update({
      ...data,
      updated_at: db.fn.now(),
    })
    .returning('*');
};

// ─── Queue Counter Helpers ──────────────────────────────────────────────────────

/**
 * Returns the next available queue_number for a given doctor on a given date.
 * Performs MAX(queue_number) + 1 and defaults to 1 if no appointments exist yet.
 * Should be called inside a transaction with FOR UPDATE to prevent race conditions.
 */
export const getNextQueueNumber = async (
  doctorId: number,
  appointmentDate: string,
  trx?: import('knex').Knex.Transaction,
): Promise<number> => {
  const query = trx ? trx('appointments') : db('appointments');
  const result = await query
    .where('doctor_id', doctorId)
    .where(function () {
      this.where('appointment_date', appointmentDate).orWhereRaw('DATE(starts_at) = ?', [appointmentDate]);
    })
    .whereNotIn('status', ['cancelled', 'no_show'])
    .max('queue_number as max_queue')
    .first();

  const maxQueue = (result as any)?.max_queue ?? null;
  return maxQueue === null ? 1 : Number(maxQueue) + 1;
};

/**
 * Returns the queue_number of the appointment that is currently being served
 * (status 'with_nurse' or 'in_consultation') for a doctor on a given date.
 * Returns null if no one is currently being served.
 */
export const getCurrentServingNumber = async (
  doctorId: number,
  appointmentDate: string,
): Promise<number | null> => {
  const serving = await db('appointments')
    .where('doctor_id', doctorId)
    .where(function () {
      this.where('appointment_date', appointmentDate).orWhereRaw('DATE(starts_at) = ?', [appointmentDate]);
    })
    .whereIn('status', ['with_nurse', 'in_consultation'])
    .orderBy('queue_number', 'asc')
    .select('queue_number')
    .first();

  return serving?.queue_number ?? null;
};

