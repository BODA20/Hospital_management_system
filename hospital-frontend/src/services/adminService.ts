import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';
import { AdminSummaryStats, SecurityLog, StaffApplication } from '../types/dashboard.types';

export const adminService = {
  // Staff management
  async getStaffMembers(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/admins/staff');
    return res.data;
  },

  async createStaffAccount(data: any): Promise<ApiResponse<any>> {
    const payload = {
      full_name: data.full_name?.trim(),
      email: data.email?.toLowerCase().trim(),
      phone: data.phone ? data.phone.trim() : undefined,
      role: data.role ? String(data.role).toLowerCase() : 'doctor',
      assigned_shift: data.assigned_shift ? String(data.assigned_shift).toLowerCase() : 'morning',
      password: data.password || undefined,
      department_id: (data.department_id && !isNaN(Number(data.department_id)) && Number(data.department_id) > 0)
        ? Number(data.department_id)
        : undefined,
    };
    const res = await apiClient.post('/admins/staff/create', payload);
    return res.data;
  },

  async assignDepartment(doctor_id: number, department_id: number): Promise<ApiResponse> {
    const res = await apiClient.put('/admins/assign-department', { doctor_id, department_id });
    return res.data;
  },

  async reassignShift(userId: number, shift: 'Morning' | 'Night'): Promise<ApiResponse> {
    const res = await apiClient.patch('/shifts', { userId, shift });
    return res.data;
  },

  // Audit logs
  async getSecurityLogs(params?: { action_type?: string; search?: string; limit?: number }): Promise<ApiResponse<SecurityLog[]>> {
    const res = await apiClient.get('/audit/security-logs', { params });
    return res.data;
  },

  // Metrics & Dashboard
  async getAdminSummary(): Promise<ApiResponse<AdminSummaryStats>> {
    const res = await apiClient.get('/dashboard/admin-summary');
    return res.data;
  },

  async getDashboardStats(params?: { period?: string; startDate?: string; endDate?: string }): Promise<ApiResponse<any>> {
    const res = await apiClient.get('/dashboard/stats', { params });
    return res.data;
  },

  async getMetricsSummary(): Promise<ApiResponse<any>> {
    const res = await apiClient.get('/metrics/summary');
    return res.data;
  },

  // Staff Applications
  async submitStaffApplication(data: any): Promise<ApiResponse<StaffApplication>> {
    const res = await apiClient.post('/staff-applications', data);
    return res.data;
  },

  async getMyApplications(): Promise<ApiResponse<StaffApplication[]>> {
    const res = await apiClient.get('/staff-applications/me');
    return res.data;
  },

  async getAllApplications(): Promise<ApiResponse<StaffApplication[]>> {
    const res = await apiClient.get('/staff-applications');
    return res.data;
  },

  async processApplication(id: number, status: 'approved' | 'rejected', rejection_reason?: string): Promise<ApiResponse> {
    const res = await apiClient.patch(`/staff-applications/${id}`, { status, rejection_reason });
    return res.data;
  },

  // Operational Requests
  async getStaffRequests(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/staff-requests');
    return res.data;
  },

  async createOperationalRequest(role: string): Promise<ApiResponse> {
    const res = await apiClient.post('/staff-requests', { role });
    return res.data;
  },

  async approveStaffRequest(id: number): Promise<ApiResponse> {
    const res = await apiClient.patch(`/staff-requests/${id}/approve`);
    return res.data;
  },

  async rejectStaffRequest(id: number, reason?: string): Promise<ApiResponse> {
    const res = await apiClient.patch(`/staff-requests/${id}/reject`, { reason });
    return res.data;
  }
};
