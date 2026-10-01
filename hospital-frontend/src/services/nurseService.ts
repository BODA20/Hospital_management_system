import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';

export const nurseService = {
  async getVitalsQueue(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/nurses/vitals-queue');
    return res.data;
  },

  async getMyBeds(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/nurses/me/beds');
    return res.data;
  },

  async getMyTasks(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/nurses/me/tasks');
    return res.data;
  }
};
