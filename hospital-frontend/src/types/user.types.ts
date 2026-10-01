import { User } from './auth.types';

export interface DoctorProfile {
  id: number;
  user_id: number;
  full_name?: string;
  name?: string;
  email?: string;
  specialization: string;
  years_of_experience: number;
  bio?: string;
  consultation_fee: number;
  department_id?: number | null;
  department_name?: string | null;
  license_number?: string | null;
  department?: {
    id: number;
    name_en: string;
    name_ar?: string;
  };
}

export interface NurseProfile {
  id: number;
  user_id: number;
  full_name?: string;
  department_id?: number | null;
  department_name?: string | null;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience: number;
  notes?: string;
  license_number?: string | null;
}

export interface PatientProfile {
  id: number;
  user_id: number;
  full_name: string;
  email?: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  emergency_contact: string;
  notes?: string;
}

export interface Department {
  id: number;
  name_en: string;
  name_ar?: string | null;
}
