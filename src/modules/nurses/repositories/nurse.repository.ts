import db from '../../../config/db';

const nurseWithDetails = () =>
  db('nurses as n')
    .join('users as u', 'n.user_id', 'u.id')
    .join('departments as dept', 'n.department_id', 'dept.id')
    .select(
      'n.id',
      'n.user_id',
      'n.shift',
      'n.years_of_experience',
      'n.notes',
      'n.department_id', 
      'n.created_at',
      'n.updated_at',
      'u.full_name as nurse_name',
      'u.email as nurse_email',
      'dept.name_en as department_name'
    );

// ─── Create Nurse ──────────────────────────────────────────────────────────────
export const createNurse = async (data: {
  user_id: number;
  department_id?: number | null;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience?: number;
  notes?: string;
}, trx?: import('knex').Knex.Transaction) => {
  const query = trx ? trx('nurses') : db('nurses');
  const [nurse] = await query.insert(data).returning('*');
  return nurse;
};

// ─── Get All Nurses (enriched) ─────────────────────────────────────────────────
export const getNurses = async () => {
  return nurseWithDetails().orderBy('n.id', 'asc');
};


// ─── Get Nurses by Department ──────────────────────────────────────────────────
export const getNursesByDepartment = async (departmentId: number) => {
  return nurseWithDetails()
    .where('n.department_id', departmentId)
    .orderBy('n.shift', 'asc');
};

// ─── Find Nurse by ID ──────────────────────────────────────────────────────────
export const findById = async (id: number) => {
  return nurseWithDetails().where('n.id', id).first();
};

export const findByUserId = async (userId: number, trx?: import('knex').Knex.Transaction) => {
  const query = trx ? trx('nurses') : db('nurses');
  return query.where({ user_id: userId }).first();
};

// ─── Update Nurse ──────────────────────────────────────────────────────────────
export const updateNurse = async (id: number, data: Partial<{
  department_id: number;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience: number;
  notes: string;
}>, trx?: import('knex').Knex.Transaction) => {
  const query = trx ? trx('nurses') : db('nurses');
  const [updated] = await query
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return updated;
};

// ─── Delete Nurse ──────────────────────────────────────────────────────────────
export const deleteNurse = async (id: number) => {
  return db('nurses').where({ id }).delete();
};

export interface VitalsQueueItem {
  id: number;
  visit_id?: number | null;
  appointment_id?: number | null;
  patient_id: number;
  patient_name: string;
  patient_email?: string | null;
  patient_phone?: string | null;
  doctor_id: number;
  doctor_name: string;
  chief_complaint?: string | null;
  reason?: string | null;
  starts_at?: string | null;
  appointment_date?: string | null;
  time_slot?: string | null;
  status: string;
  queue_status?: string | null;
  is_appointment: boolean;
  is_missed?: boolean;
}

export const getVitalsQueue = async (): Promise<VitalsQueueItem[]> => {
  try {
    // 1. Fetch visits awaiting vitals strictly checked-in or created TODAY (CURRENT_DATE)
    const visits = await db('visits as v')
      .leftJoin('patients as p', 'v.patient_id', 'p.id')
      .leftJoin('users as pu', 'p.user_id', 'pu.id')
      .leftJoin('doctors as d', 'v.doctor_id', 'd.id')
      .leftJoin('users as du', 'd.user_id', 'du.id')
      .whereIn('v.status', ['awaiting_vitals', 'in_progress'])
      .andWhere(function (this: any) {
        this.whereRaw("v.check_in_at::date = CURRENT_DATE")
          .orWhereRaw("v.created_at::date = CURRENT_DATE");
      })
      .andWhere(function (this: any) {
        this.whereNull('v.vitals').orWhereIn('v.status', ['awaiting_vitals', 'in_progress']);
      })
      .whereNotIn('v.status', ['completed', 'cancelled'])
      .select(
        'v.id as visit_id',
        'v.id',
        'v.appointment_id',
        'v.patient_id',
        'v.doctor_id',
        'v.chief_complaint',
        'v.status',
        'v.check_in_at',
        db.raw("COALESCE(pu.full_name, 'Patient #' || v.patient_id::text) as patient_name"),
        'pu.email as patient_email',
        'pu.phone as patient_phone',
        db.raw("COALESCE(du.full_name, 'Doctor #' || v.doctor_id::text) as doctor_name")
      )
      .orderBy('v.check_in_at', 'asc');

    // 2. 24-HOUR AUTO FLUSH DATE FILTER:
    //    STRICTLY fetch appointments where appointment_date = CURRENT_DATE or starts_at::date = CURRENT_DATE.
    //    Past dates (e.g., yesterday) MUST NOT load into the active queue.
    const appointments = await db('appointments as a')
      .leftJoin('patients as p', 'a.patient_id', 'p.id')
      .leftJoin('users as pu', 'p.user_id', 'pu.id')
      .leftJoin('doctors as d', 'a.doctor_id', 'd.id')
      .leftJoin('users as du', 'd.user_id', 'du.id')
      .leftJoin('visits as v', 'a.id', 'v.appointment_id')
      .whereIn('a.status', ['confirmed', 'scheduled', 'pending', 'in_progress'])
      .andWhere(function (this: any) {
        const todayStr = new Date().toISOString().split('T')[0];
        this.whereRaw("a.starts_at::date = CURRENT_DATE")
          .orWhereRaw("a.appointment_date::date = CURRENT_DATE")
          .orWhere('a.appointment_date', todayStr);
      })
      .andWhere(function (this: any) {
        this.whereNull('v.id').orWhereNotIn('v.status', ['completed', 'cancelled']);
      })
      .select(
        'a.id as appointment_id',
        'a.id',
        'a.patient_id',
        'a.doctor_id',
        'a.starts_at',
        'a.appointment_date',
        'a.time_slot',
        'a.reason as chief_complaint',
        'a.queue_status',
        'a.status as appt_status',
        db.raw("COALESCE(pu.full_name, 'Patient #' || a.patient_id::text) as patient_name"),
        'pu.email as patient_email',
        'pu.phone as patient_phone',
        db.raw("COALESCE(du.full_name, 'Doctor #' || a.doctor_id::text) as doctor_name"),
        'v.id as visit_id'
      )
      .orderBy('a.starts_at', 'asc');

    const itemsMap = new Map<string, VitalsQueueItem>();
    const now = new Date();

    for (const v of visits) {
      const key = `visit_${v.visit_id}`;
      itemsMap.set(key, {
        id: v.visit_id,
        visit_id: v.visit_id,
        appointment_id: v.appointment_id,
        patient_id: v.patient_id,
        patient_name: v.patient_name,
        patient_email: v.patient_email,
        patient_phone: v.patient_phone,
        doctor_id: v.doctor_id,
        doctor_name: v.doctor_name,
        chief_complaint: v.chief_complaint,
        starts_at: v.check_in_at,
        status: v.status || 'awaiting_vitals',
        queue_status: 'ready_for_vitals',
        is_appointment: false,
        is_missed: false,
      });
    }

    for (const a of appointments) {
      const key = a.visit_id ? `visit_${a.visit_id}` : `appt_${a.appointment_id}`;
      if (!itemsMap.has(key)) {
        // Calculate start time to evaluate > 60 mins expiration
        let startTime: Date | null = null;
        if (a.starts_at) {
          startTime = new Date(a.starts_at);
        } else if (a.appointment_date) {
          const slotStart = a.time_slot ? a.time_slot.split('-')[0].trim() : '00:00';
          const formattedSlot = slotStart.length === 5 ? `${slotStart}:00` : slotStart;
          startTime = new Date(`${a.appointment_date}T${formattedSlot}`);
        }

        // Expired Slot / Missed Window (> 60 mins past scheduled slot & no vitals recorded)
        const isMissed = Boolean(
          startTime &&
          !isNaN(startTime.getTime()) &&
          a.queue_status !== 'vitals_completed' &&
          (now.getTime() - startTime.getTime()) > 60 * 60 * 1000
        );

        itemsMap.set(key, {
          id: a.visit_id || a.appointment_id,
          visit_id: a.visit_id || null,
          appointment_id: a.appointment_id,
          patient_id: a.patient_id,
          patient_name: a.patient_name,
          patient_email: a.patient_email,
          patient_phone: a.patient_phone,
          doctor_id: a.doctor_id,
          doctor_name: a.doctor_name,
          chief_complaint: a.chief_complaint,
          starts_at: a.starts_at || (a.appointment_date ? `${a.appointment_date} ${a.time_slot || ''}` : null),
          appointment_date: a.appointment_date,
          time_slot: a.time_slot,
          status: isMissed ? 'no_show' : 'awaiting_vitals',
          queue_status: isMissed ? 'missed' : (a.queue_status || 'ready_for_vitals'),
          is_appointment: !a.visit_id,
          is_missed: isMissed,
        });
      }
    }

    return Array.from(itemsMap.values());
  } catch (error) {
    console.error('Error executing getVitalsQueue database query:', error);
    return [];
  }
};

