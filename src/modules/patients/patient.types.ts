// ─── Enums ─────────────────────────────────────────────────────────────────────
export type PatientGender = 'male' | 'female' | 'other';

export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';

// ─── Core Patient Interface ────────────────────────────────────────────────────
// Mirrors the `patients` table row (joined with `users` for profile fields).
export interface Patient {
  id: number;
  user_id: number;
  date_of_birth: Date | string | null;
  phone: string | null;
  gender: PatientGender | null;
  blood_group: BloodGroup | null;
  emergency_contact: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Enriched Patient (after JOIN with users) ──────────────────────────────────
export interface PatientProfile extends Patient {
  full_name: string;
  email: string;
  is_active: boolean;
  // Computed at service layer — NOT stored in DB
  age?: number | null;
}

// ─── DTO Types ─────────────────────────────────────────────────────────────────
export interface CreatePatientInput {
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  gender: PatientGender;
  date_of_birth: string;
  blood_group?: BloodGroup;
  emergency_contact: string;
}

export interface UpdatePatientInput {
  phone?: string;
  gender?: PatientGender;
  date_of_birth?: string;
  blood_group?: BloodGroup;
  emergency_contact?: string;
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
