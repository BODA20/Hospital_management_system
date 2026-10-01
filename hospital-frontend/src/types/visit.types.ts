export interface Vitals {
  bp?: string;
  pulse?: number;
  temperature?: number;
  weight?: number;
  respiratory_rate?: number;
}

export type VisitStatus =
  | 'awaiting_vitals'
  | 'ready_for_doctor'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Visit {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_id?: number | null;
  reason_for_visit: string;
  diagnosis: string;
  treatment_plan?: string | null;
  notes?: string | null;
  status?: VisitStatus;
  vitals?: Vitals | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
  patient_name?: string;
  doctor_name?: string;
  created_at?: string;
}
