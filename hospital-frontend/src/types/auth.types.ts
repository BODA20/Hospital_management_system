export type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient' | 'receptionist';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  assigned_shift?: 'Morning' | 'Night' | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface SignupResponse {
  user: User;
}
