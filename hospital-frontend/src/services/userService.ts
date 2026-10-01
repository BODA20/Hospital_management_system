import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';
import { User } from '../types/auth.types';
import { DoctorProfile, NurseProfile, PatientProfile, Department } from '../types/user.types';

export const userService = {
  // Users
  async getAllUsers(): Promise<ApiResponse<User[]>> {
    const res = await apiClient.get('/users');
    return res.data;
  },

  async getUserById(id: number): Promise<ApiResponse<User>> {
    const res = await apiClient.get(`/users/${id}`);
    return res.data;
  },

  async adminUpdateUser(id: number, data: any): Promise<ApiResponse<User>> {
    const res = await apiClient.patch(`/users/${id}`, data);
    return res.data;
  },

  async deactivateUser(id: number): Promise<ApiResponse<User>> {
    const res = await apiClient.delete(`/users/${id}`);
    return res.data;
  },

  // Doctors
  async getAllDoctors(): Promise<ApiResponse<DoctorProfile[]>> {
    const res = await apiClient.get('/doctors');
    return res.data;
  },

  async getDoctorById(id: number): Promise<ApiResponse<DoctorProfile>> {
    const res = await apiClient.get(`/doctors/${id}`);
    return res.data;
  },

  async getMyDoctorProfile(): Promise<ApiResponse<DoctorProfile>> {
    const res = await apiClient.get('/doctors/me');
    return res.data;
  },

  async updateMyDoctorProfile(data: any): Promise<ApiResponse<DoctorProfile>> {
    const res = await apiClient.patch('/doctors/me', data);
    return res.data;
  },

  async getAvailableSlots(doctorId: number, date?: string): Promise<ApiResponse<{ available_slots: string[] }>> {
    const res = await apiClient.get(`/doctors/${doctorId}/available-slots`, { params: { date } });
    return res.data;
  },

  // Nurses
  async getAllNurses(): Promise<ApiResponse<NurseProfile[]>> {
    const res = await apiClient.get('/nurses');
    return res.data;
  },

  async createNurse(data: any): Promise<ApiResponse<NurseProfile>> {
    const res = await apiClient.post('/nurses', data);
    return res.data;
  },

  // Patients
  async getMyPatientProfile(): Promise<ApiResponse<PatientProfile>> {
    const res = await apiClient.get('/patients/me');
    return res.data;
  },

  async getAllPatients(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<{ patients: PatientProfile[]; total: number }>> {
    const res = await apiClient.get('/patients', { params });
    return res.data;
  },

  async createPatient(data: any): Promise<ApiResponse<PatientProfile>> {
    const res = await apiClient.post('/patients', data);
    return res.data;
  },

  async getPatientById(id: number): Promise<ApiResponse<PatientProfile>> {
    const res = await apiClient.get(`/patients/${id}`);
    return res.data;
  },

  // Departments
  async getDepartments(): Promise<ApiResponse<Department[]>> {
    const res = await apiClient.get('/departments');
    return res.data;
  },

  async createDepartment(data: { name_en: string; name_ar?: string }): Promise<ApiResponse<Department>> {
    const res = await apiClient.post('/departments', data);
    return res.data;
  },

  async deleteDepartment(id: number): Promise<ApiResponse> {
    const res = await apiClient.delete(`/departments/${id}`);
    return res.data;
  }
};
