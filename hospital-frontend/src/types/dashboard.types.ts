export interface AdminSummaryStats {
  total_patients: number;
  total_doctors: number;
  total_nurses: number;
  appointments_today: number;
  revenue_this_month: number;
  pending_applications: number;
}

export interface SecurityLog {
  id: number;
  user_id?: number | null;
  actor_name: string;
  action_type: string;
  description: string;
  ip_address?: string | null;
  created_at: string;
}

export interface StaffApplication {
  id: number;
  user_id: number;
  requested_role: 'doctor' | 'nurse';
  requested_shift: 'Morning' | 'Night';
  specialization_notes?: string | null;
  license_number?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
}
