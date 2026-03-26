import db from '../../../config/db';

export const createRequest = async (data: {
  user_id: number;
  requested_role: string;
}) => {
  const [request] = await db('staff_requests')
    .insert({
      ...data,
      status: 'pending',
    })
    .returning('*');

  return request;
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
) => {
  const [updated] = await db('staff_requests')
    .where({ id })
    .update(data)
    .returning('*');

  return updated;
};

export const findById = async (id: number) => {
  return db('staff_requests').where({ id }).first();
};

export const getAllPending = () => {
  return db('staff_requests').where({ status: 'pending' });
};
