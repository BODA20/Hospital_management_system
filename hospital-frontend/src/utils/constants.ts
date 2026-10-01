// Use a relative path so requests go through the Vite proxy (/api → http://localhost:3001)
// This avoids cross-origin (CORS) issues when running in WSL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const USER_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  PATIENT: 'patient',
  RECEPTIONIST: 'receptionist',
} as const;

export type UserRoleType = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const VISIT_STATUSES = {
  AWAITING_VITALS: 'awaiting_vitals',
  READY_FOR_DOCTOR: 'ready_for_doctor',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUSES = {
  UNPAID: 'unpaid',
  PAID_CASH: 'paid_cash',
  PAID_ONLINE: 'paid_online',
  PAID: 'paid',
} as const;
