import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';
import { Appointment, CreateAppointmentInput } from '../types/appointment.types';

export const appointmentService = {
  async createAppointment(data: CreateAppointmentInput): Promise<ApiResponse<Appointment>> {
    let cleanSlot = data.time_slot || undefined;
    if (cleanSlot && cleanSlot.includes(' ')) {
      cleanSlot = cleanSlot.split(' ')[0];
    }

    const payload = {
      doctor_id: Number(data.doctor_id),
      department_id: (data.department_id && !isNaN(Number(data.department_id)) && Number(data.department_id) > 0)
        ? Number(data.department_id)
        : undefined,
      patient_id: data.patient_id ? Number(data.patient_id) : undefined,
      appointment_date: data.appointment_date || undefined,
      time_slot: cleanSlot,
      starts_at: data.starts_at || undefined,
      reason: data.reason || undefined,
      notes: data.notes || undefined,
    };

    const res = await apiClient.post('/appointments', payload);
    return res.data;
  },

  async getMyAppointments(): Promise<ApiResponse<Appointment[]>> {
    const res = await apiClient.get('/appointments/me');
    return res.data;
  },

  async getDoctorScheduleToday(): Promise<ApiResponse<Appointment[]>> {
    const res = await apiClient.get('/appointments/doctor/schedule/today');
    return res.data;
  },

  async getDoctorAppointments(): Promise<ApiResponse<Appointment[]>> {
    const res = await apiClient.get('/appointments/doctor');
    return res.data;
  },

  async getAllAppointments(): Promise<ApiResponse<Appointment[]>> {
    const res = await apiClient.get('/appointments');
    return res.data;
  },

  async updateAppointmentStatus(id: number, status: string, notes?: string): Promise<ApiResponse<Appointment>> {
    const res = await apiClient.patch(`/appointments/${id}/status`, { status, notes });
    return res.data;
  },

  async completeAppointment(id: number): Promise<ApiResponse<Appointment>> {
    const res = await apiClient.patch(`/appointments/${id}/complete`);
    return res.data;
  },

  async rescheduleAppointment(id: number, data: any): Promise<ApiResponse<Appointment>> {
    const res = await apiClient.patch(`/appointments/${id}/reschedule`, data);
    return res.data;
  },

  async confirmByToken(token: string, id?: string | number): Promise<ApiResponse<any>> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await apiClient.post('/appointments/confirm', { token, id }, { headers });
    return res.data;
  },

  async cancelByToken(token: string, id?: string | number): Promise<ApiResponse<any>> {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await apiClient.post('/appointments/cancel', { token, id }, { headers });
    return res.data;
  }
};

