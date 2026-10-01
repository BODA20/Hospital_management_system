import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach JWT Bearer token ──────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    // Keys written by AuthContext.login():
    //   localStorage.setItem('accessToken', accessToken)
    const token =
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const url = config.url || '';
      const isPublic = /\/(login|signup|verify-otp|resend-otp|forgot-password|refresh|reset-password|verify-email)/.test(url);
      if (!isPublic) {
        console.warn('[apiClient] No token in storage for request:', config.method?.toUpperCase(), url);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 token expiry via refresh ─────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';

    // Do NOT perform automatic 401 redirects for authentication endpoints (e.g., /auth/login)
    const isAuthEndpoint = /\/auth\/(login|signup|verify-otp|resend-otp|forgot-password|reset-password|refresh)/.test(requestUrl);

    if (error.response?.status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data?.data?.accessToken;
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            console.info('[apiClient] Token refreshed successfully.');
            return apiClient(originalRequest);
          }
        } catch (refreshErr) {
          console.error('[apiClient] Token refresh failed — redirecting to login.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        // No refresh token — session fully expired
        console.error('[apiClient] 401 received and no refresh token — redirecting to login.');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  },
);
