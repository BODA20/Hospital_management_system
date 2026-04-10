import db from '../../../config/db';

// ─── Shared enriched select ────────────────────────────────────────────────────
// Joins users (for nurse name), doctors+users (for doctor name), departments.
const nurseWithDetails = () =>
  db('nurses as n')
    .join('users as u', 'n.user_id', 'u.id')
    .join('doctors as d', 'n.doctor_id', 'd.id')
    .join('users as du', 'd.user_id', 'du.id')
    .join('departments as dept', 'n.department_id', 'dept.id')
    .select(
      'n.id',
      'n.user_id',
      'n.license_number',
      'n.shift',
      'n.years_of_experience',
      'n.notes',
      'n.doctor_id',
      'n.department_id',
      'n.created_at',
      'n.updated_at',
      // Enriched fields
      'u.full_name as nurse_name',
      'u.email as nurse_email',
      'du.full_name as doctor_name',
      'dept.name as department_name',
      'dept.code as department_code',
    );

// ─── Create Nurse ──────────────────────────────────────────────────────────────
export const createNurse = async (data: {
  user_id: number;
  department_id: number;
  doctor_id: number;
  license_number: string;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience?: number;
  notes?: string;
}) => {
  const [nurse] = await db('nurses').insert(data).returning('*');
  return nurse;
};

// ─── Get All Nurses (enriched) ─────────────────────────────────────────────────
export const getNurses = async () => {
  return nurseWithDetails().orderBy('n.id', 'asc');
};

// ─── Get Nurses by Doctor ──────────────────────────────────────────────────────
// Returns all nurses assigned to a specific doctor (by doctors.id PK).
export const getNursesByDoctor = async (doctorId: number) => {
  return nurseWithDetails()
    .where('n.doctor_id', doctorId)
    .orderBy('n.shift', 'asc');
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

// ─── Find Nurse by user_id ────────────────────────────────────────────────────
export const findByUserId = async (userId: number) => {
  return db('nurses').where({ user_id: userId }).first();
};

// ─── Update Nurse ──────────────────────────────────────────────────────────────
export const updateNurse = async (id: number, data: Partial<{
  department_id: number;
  doctor_id: number;
  license_number: string;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience: number;
  notes: string;
}>) => {
  const [updated] = await db('nurses')
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning('*');
  return updated;
};

// ─── Delete Nurse ──────────────────────────────────────────────────────────────
export const deleteNurse = async (id: number) => {
  return db('nurses').where({ id }).delete();
};
