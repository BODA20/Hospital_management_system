export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  department_id?: number | null;
  appointment_date?: string | null;
  time_slot?: string | null;
  starts_at?: string | null;
  reason?: string | null;
  notes?: string | null;
  status: AppointmentStatus;
  booking_source?: 'online' | 'walk_in';
  queue_number?: number | null;
  payment_status?: 'unpaid' | 'paid_cash' | 'paid_online' | 'paid';
  patient_name?: string;
  patient_phone?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  department_name?: string;
  created_at?: string;
}

export interface CreateAppointmentInput {
  doctor_id: number;
  department_id?: number | null;
  patient_id?: number | null;
  appointment_date?: string | null;
  time_slot?: string | null;
  starts_at?: string | null;
  reason?: string | null;
  notes?: string | null;
}
