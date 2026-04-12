import db from '../../../config/db';
import type { Knex } from 'knex';

export const createRequest = async (data: {
  user_id: number;
  requested_role: string;
  specialization?: string;
  consultation_fee?: number;
  experience_years?: number;
  bio?: string;
}) => {
  const [request] = await db('staff_requests')
    .insert({
      ...data,
      status: 'pending',
    })
    .returning('*');

  return request;
};

export const findById = async (id: number, trx?: Knex.Transaction) => {
  const query = trx ? trx('staff_requests') : db('staff_requests');
  return query.where({ id }).first();
};

export const findByUserId = async (userId: number) => {
  return db('staff_requests').where({ user_id: userId }).first();
};

export const updateStatus = async (
  id: number,
  data: Partial<{
    status: string;
    approved_by: number;
    approved_at: Date;
    rejection_reason: string;
  }>,
  trx?: Knex.Transaction
) => {
  const query = trx ? trx('staff_requests') : db('staff_requests');
  const [updated] = await query
    .where({ id })
    .update(data)
    .returning('*');

  return updated;
};

export const getAllPending = () => {
  return db('staff_requests').where({ status: 'pending' });
};