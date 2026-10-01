import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';

export const receptionService = {
  async getDoctors(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/reception/doctors');
    return res.data;
  },

  async getTodayQueue(date?: string): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get('/reception/queue/today', {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  async registerPatient(data: { full_name: string; phone: string; national_id?: string }): Promise<ApiResponse<any>> {
    const res = await apiClient.post('/reception/patients', data);
    return res.data;
  },

  async bookWalkIn(data: {
    patient_id?: number;
    full_name?: string;
    phone?: string;
    doctor_id: number;
    appointment_date: string;
    time_slot?: string;
    payment_status?: string;
  }): Promise<ApiResponse<any>> {
    const res = await apiClient.post('/reception/book-walk-in', data);
    return res.data;
  },

  async getBookedSlots(doctorId: number, date: string): Promise<ApiResponse<{ bookedSlots: string[]; shift: string }>> {
    const res = await apiClient.get(`/reception/doctors/${doctorId}/booked-slots`, {
      params: { date },
    });
    return res.data;
  },

  async checkIn(appointmentId: number): Promise<ApiResponse<any>> {
    const res = await apiClient.patch(`/reception/queue/${appointmentId}/check-in`);
    return res.data;
  },
};
