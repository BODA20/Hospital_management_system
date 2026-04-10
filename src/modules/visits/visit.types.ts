// ─── Vitals ────────────────────────────────────────────────────────────────────
export interface Vitals {
  bp?: string;          // e.g. "120/80"
  pulse?: number;       // beats per minute
  temperature?: number; // Celsius
  weight?: number;      // kg
}

// ─── Visit status type ─────────────────────────────────────────────────────────
export type VisitStatus =
  | 'awaiting_vitals'
  | 'ready_for_doctor'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

// ─── Core Visit row (mirrors DB) ──────────────────────────────────────────────
export interface Visit {
  id: number;
  patient_id: number;
  doctor_id: number;
  nurse_id: number | null;
  appointment_id: number | null;
  department_id: number | null;
  status: VisitStatus;
  check_in_at: Date;
  check_out_at: Date | null;
  chief_complaint: string | null;   // = "reason_for_visit" in request body
  diagnosis: string | null;
  treatment_plan: string | null;
  notes: string | null;
  vitals: Vitals | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Enriched visit (after JOINs) ─────────────────────────────────────────────
export interface VisitDetail extends Visit {
  patient_name: string;
  patient_email: string;
  doctor_name: string;
  department_name: string | null;
}

// ─── Enriched visit with vitals summary (for doctor dashboard) ─────────────────
export interface PendingVisitDetail extends VisitDetail {
  vitals_summary: string | null;
}

// ─── Create Visit input ────────────────────────────────────────────────────────
export interface CreateVisitInput {
  patient_id: number;
  doctor_id: number;
  appointment_id?: number;
  reason_for_visit: string;   // mapped → chief_complaint in repo
  diagnosis: string;
  treatment_plan?: string;
  notes?: string;
  vitals?: Vitals;
  check_in_at?: string;       // ISO datetime; defaults to now()
}

// ─── Update Visit input ────────────────────────────────────────────────────────
export interface UpdateVisitInput {
  status?: VisitStatus;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  vitals?: Vitals;
  check_out_at?: string;
}

// ─── Record Vitals input (nurse action) ───────────────────────────────────────
export interface RecordVitalsInput {
  vitals: Vitals;
  nurse_id: number;
}
