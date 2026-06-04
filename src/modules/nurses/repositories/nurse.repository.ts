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
      'dept.name as department_name', 
      'dept.code as department_code'
    );

// ─── Create Nurse ──────────────────────────────────────────────────────────────
export const createNurse = async (data: {
  user_id: number;
  department_id: number;
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
