import db from '../../../config/db';

export const createNotification = async (data: {
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: number;
}) => {
  const [notification] = await db('notifications')
    .insert(data)
    .returning('*');
  return notification;
};

export const getNotificationsForUser = async (userId: number) => {
  return db('notifications')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(100);
};

export const getUnreadCount = async (userId: number) => {
  const result = await db('notifications')
    .where({ user_id: userId, is_read: false })
    .count('* as count')
    .first();
  return { count: Number((result as any)?.count || 0) };
};

export const markAsRead = async (id: number, userId: number) => {
  const [updated] = await db('notifications')
    .where({ id, user_id: userId })
    .update({ is_read: true, read_at: db.fn.now() })
    .returning('*');
  return updated;
};

export const markAllAsRead = async (userId: number) => {
  await db('notifications')
    .where({ user_id: userId, is_read: false })
    .update({ is_read: true, read_at: db.fn.now() });
};
