import * as repo from '../repositories/notification.repo';
import { EventEmitter } from 'events';
import logger from '../../../common/utils/logger';

// Global Event Emitter for SSE
export const notificationEmitter = new EventEmitter();

// Increase max listeners if needed
notificationEmitter.setMaxListeners(100);

export const createNotification = async (data: {
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: number;
}) => {
  const notification = await repo.createNotification(data);
  
  // Emit event for SSE
  notificationEmitter.emit(`user:${data.user_id}`, notification);
  
  return notification;
};

export const createNotificationForRole = async (role: string, data: {
  type: string;
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: number;
}) => {
  const db = (await import('../../../config/db')).default;
  const users = await db('users').where({ role, is_active: true }).select('id');
  
  for (const user of users) {
    if (user.id) {
      await createNotification({ ...data, user_id: user.id as number });
    }
  }
};

export const getNotifications = async (userId: number) => {
  return repo.getNotificationsForUser(userId);
};

export const getUnreadCount = async (userId: number) => {
  return repo.getUnreadCount(userId);
};

export const markAsRead = async (id: number, userId: number) => {
  return repo.markAsRead(id, userId);
};

export const markAllAsRead = async (userId: number) => {
  return repo.markAllAsRead(userId);
};
