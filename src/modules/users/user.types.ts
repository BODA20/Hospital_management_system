export type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
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

export type PublicUser = Omit<User, 'password'>;
export type NewUserInput = Pick<User, 'name' | 'email' | 'role' | 'password'>;
