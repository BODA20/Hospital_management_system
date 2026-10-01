export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  PATIENT = 'patient',
}

export type UpdateProfileDTO = {
  full_name?: string;
};

export interface User {
  id: number;
  full_name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
}

export type PublicUser = Omit<User, 'password_hash'>;
export type NewUserInput = Pick<User, 'full_name' | 'email' | 'password_hash'> & { role?: UserRole };
