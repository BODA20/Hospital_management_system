// ─── Audit Log Action Types ────────────────────────────────────────────────────
export const AUDIT_ACTION_TYPES = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'USER_BANNED',
  'USER_UNBANNED',
  'ROLE_CHANGED',
  'LEAVE_REQUEST_SUBMITTED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'ACCOUNT_CREATED',
  'APPOINTMENT_BOOKED',
  'DEPARTMENT_CREATED',
  'DEPARTMENT_DELETED',
  'STAFF_ASSIGNED_TO_DEPARTMENT',
  'ASSIGN_STAFF_DEPARTMENT',
  // ── New action types added in full audit sweep ─────────────────────────
  'STAFF_APPLICATION_SUBMITTED',
  'STAFF_REQUEST_APPROVED',
  'STAFF_REQUEST_REJECTED',
  'USER_DEACTIVATED',
  'USER_PROFILE_UPDATED',
  'NURSE_CREATED',
  'NURSE_UPDATED',
  'NURSE_DELETED',
  'DOCTOR_UPDATED',
  'PATIENT_CREATED',
  'PATIENT_DELETED',
  'VISIT_CREATED',
  'VISIT_DELETED',
  'PAYMENT_PROCESSED',
  'APPOINTMENT_STATUS_UPDATED',
  // ── Receptionist Portal action types ──────────────────────────────────
  'WALKIN_PATIENT_REGISTERED',
  'WALKIN_APPOINTMENT_BOOKED',
] as const;

export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number];

// ─── DB Row Shape ──────────────────────────────────────────────────────────────
export interface SecurityLog {
  id: number;
  user_id: number | null;
  actor_name: string;
  action_type: AuditActionType;
  description: string;
  ip_address: string | null;
  created_at: string;
}

// ─── Insert Payload ────────────────────────────────────────────────────────────
export interface CreateAuditLogDTO {
  user_id?: number | null;
  actor_name: string;
  action_type: AuditActionType;
  description: string;
  ip_address?: string | null;
}
