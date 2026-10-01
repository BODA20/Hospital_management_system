import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';
import { Visit } from '../types/visit.types';

export const visitService = {
  async getPendingVisits(): Promise<ApiResponse<Visit[]>> {
    const res = await apiClient.get('/visits/pending');
    return res.data;
  },

  async getMyVisits(): Promise<ApiResponse<Visit[]>> {
    const res = await apiClient.get('/visits/my-visits');
    return res.data;
  },

  /** Patient-only: fetch the authenticated patient's own visit history */
  async getMyRecords(): Promise<ApiResponse<any>> {
    const res = await apiClient.get('/visits/my-records');
    return res.data;
  },

  async getAllVisits(): Promise<ApiResponse<Visit[]>> {
    const res = await apiClient.get('/visits');
    return res.data;
  },


  async getVisitById(id: number): Promise<ApiResponse<Visit>> {
    const res = await apiClient.get(`/visits/${id}`);
    return res.data;
  },

  async getPatientVisitHistory(patientId: number): Promise<ApiResponse<Visit[]>> {
    const res = await apiClient.get(`/visits/patient/${patientId}`);
    return res.data;
  },

  async createVisit(data: any): Promise<ApiResponse<Visit>> {
    const res = await apiClient.post('/visits', data);
    return res.data;
  },

  async recordVitals(visitId: number, vitals: any): Promise<ApiResponse<Visit>> {
    const res = await apiClient.patch(`/visits/${visitId}/vitals`, { vitals });
    return res.data;
  },

  async completeVisit(id: number): Promise<ApiResponse<Visit>> {
    const res = await apiClient.patch(`/visits/${id}/complete`);
    return res.data;
  },

  async updateVisit(id: number, data: any): Promise<ApiResponse<Visit>> {
    const res = await apiClient.patch(`/visits/${id}`, data);
    return res.data;
  },

  /** Nurse: check in a patient from an appointment (creates visit with awaiting_vitals status) */
  async nurseCheckIn(data: { appointment_id?: number; patient_id: number; doctor_id: number; chief_complaint?: string }): Promise<ApiResponse<Visit>> {
    const res = await apiClient.post('/visits/check-in', data);
    return res.data;
  },

  /** Get the visit linked to a specific appointment ID */
  async getVisitByAppointmentId(appointmentId: number): Promise<ApiResponse<Visit | null>> {
    const res = await apiClient.get(`/visits/by-appointment/${appointmentId}`);
    return res.data;
  },
};
