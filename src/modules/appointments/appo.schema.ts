import { z } from 'zod';

// ─── Create Appointment ────────────────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  doctor_id: z
    .number({ error: 'doctor_id must be a number' })
    .int('doctor_id must be an integer')
    .positive('doctor_id must be a positive integer'),

  starts_at: z
    .string({ error: 'starts_at must be a string' })
    .datetime({ message: 'starts_at must be a valid ISO 8601 datetime string' })
    .refine(
      (val) => new Date(val) > new Date(),
      'starts_at must be a future date/time',
    ),

  notes: z.string().max(1000, 'notes cannot exceed 1000 characters').optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// ─── Update Status ─────────────────────────────────────────────────────────────
export const updateStatusSchema = z.object({
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show'] as const, {
    error: 'status must be one of: scheduled, completed, cancelled, no_show',
  }),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
