import db from '../../../config/db';
import type { Knex } from 'knex';

export const createApplication = async (data: {
  user_id: number;
  requested_role: string;
  specialization_notes?: string;
  requested_shift: string;
}) => {
  const [application] = await db('staff_applications')
    .insert({
      ...data,
      status: 'pending',
    })
    .returning('*');

  return application;
};

export const findById = async (id: number, trx?: Knex.Transaction) => {
  const query = trx ? trx('staff_applications') : db('staff_applications');
  return query.where({ id }).first();
};

export const findByUserId = async (userId: number) => {
  return db('staff_applications').where({ user_id: userId }).first();
};

export const updateStatus = async (
  id: number,
  data: {
    status: 'approved' | 'rejected';
    rejection_reason?: string;
  },
  trx?: Knex.Transaction
) => {
  const query = trx ? trx('staff_applications') : db('staff_applications');
  const [updated] = await query
    .where({ id })
    .update({
      status: data.status,
      rejection_reason: data.rejection_reason || null,
      updated_at: new Date(),
    })
    .returning('*');

  return updated;
};

export const getAll = async () => {
  return db('staff_applications')
    .join('users', 'staff_applications.user_id', 'users.id')
    .select(
      'staff_applications.*',
      'users.email as user_email',
      'users.full_name as user_full_name'
    )
    .orderBy('staff_applications.created_at', 'desc');
};

export const getByUserId = async (userId: number) => {
  return db('staff_applications')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc');
};
