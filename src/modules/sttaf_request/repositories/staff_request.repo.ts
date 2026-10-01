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
  return db('staff_requests')
    .leftJoin('users', 'staff_requests.user_id', 'users.id')
    .select(
      'staff_requests.*',
      'users.email as user_email',
      'users.full_name as user_full_name'
    )
    .where({ 'staff_requests.status': 'pending' });
};

export const createOperationalRequest = async (data: {
  user_id: number;
  request_type: string;
  description: string;
}) => {
  const [request] = await db('staff_requests')
    .insert({
      user_id: data.user_id,
      request_type: data.request_type,
      requested_role: data.request_type,
      description: data.description,
      status: 'pending',
    })
    .returning('*');

  return request;
};

export const getOperationalRequestsByUserId = async (userId: number) => {
  return db('staff_requests')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc');
};