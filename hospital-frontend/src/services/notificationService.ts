import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  /** GET /api/v1/notifications — returns all notifications for current user */
  async getNotifications(): Promise<ApiResponse<Notification[]>> {
    const res = await apiClient.get('/notifications');
    return res.data;
  },

  /** GET /api/v1/notifications/unread-count — returns { count: number } */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data;
  },

  /** PATCH /api/v1/notifications/:id/read — mark single notification as read */
  async markAsRead(id: number): Promise<ApiResponse<Notification>> {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  /** PATCH /api/v1/notifications/read-all — mark all as read */
  async markAllAsRead(): Promise<ApiResponse<void>> {
    const res = await apiClient.patch('/notifications/read-all');
    return res.data;
  },
};
