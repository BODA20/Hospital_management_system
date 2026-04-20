export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PATIENT = 'patient',
}

export type UpdateProfileDTO = {
  full_name?: string;
  phone?: string | null;
};

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  email_change_token?: string | null;
  pending_email?: string | null;
  email_change_expires?: Date | null;
  password_change_at?: Date | null;
}

export type PublicUser = Omit<User, 'password_hash'>;
export type NewUserInput = Pick<User, 'full_name' | 'email' | 'password_hash'>;
