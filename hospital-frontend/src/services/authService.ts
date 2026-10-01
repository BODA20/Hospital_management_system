import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';
import { LoginResponse, SignupResponse, User } from '../types/auth.types';

export const authService = {
  async signup(data: any): Promise<ApiResponse<SignupResponse>> {
    const res = await apiClient.post('/auth/signup', data);
    return res.data;
  },

  async verifyOtp(email: string, otp: string): Promise<ApiResponse> {
    const res = await apiClient.post('/auth/verify-otp', { email, otp });
    return res.data;
  },

  async resendOtp(email: string): Promise<ApiResponse> {
    const res = await apiClient.post('/auth/resend-otp', { email });
    return res.data;
  },

  async login(credentials: { email: string; password: string }): Promise<ApiResponse<LoginResponse>> {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },

  async logout(): Promise<ApiResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      const res = await apiClient.post('/auth/logout', { refreshToken });
      return res.data;
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, password: string): Promise<ApiResponse> {
    const res = await apiClient.patch(`/auth/reset-password/${token}`, { password });
    return res.data;
  },

  async changePassword(current_password: string, new_password: string): Promise<ApiResponse> {
    const res = await apiClient.patch('/auth/change-password', { current_password, new_password });
    return res.data;
  },

  async requestChangeEmail(newEmail: string): Promise<ApiResponse> {
    const res = await apiClient.patch('/auth/change-email', { newEmail });
    return res.data;
  },

  async verifyNewEmail(token: string): Promise<ApiResponse> {
    const res = await apiClient.get(`/auth/verify-email/${token}`);
    return res.data;
  },

  async getMe(): Promise<ApiResponse<User>> {
    const res = await apiClient.get('/users/me');
    return res.data;
  },

  async updateProfile(data: { full_name?: string; phone?: string }): Promise<ApiResponse<User>> {
    const res = await apiClient.patch('/users/me', data);
    return res.data;
  }
};
