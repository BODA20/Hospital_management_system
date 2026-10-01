import { z } from 'zod';

// ─── Create Appointment ────────────────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  doctor_id: z
    .number({ error: 'doctor_id must be a number' })
    .int('doctor_id must be an integer')
    .positive('doctor_id must be a positive integer'),

  department_id: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  patient_id: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),

  appointment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'appointment_date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),

  time_slot: z
    .string()
    .max(50, 'time_slot cannot exceed 50 characters')
    .optional()
    .nullable(),

  starts_at: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'starts_at must be a valid datetime string' })
    .optional()
    .nullable(),

  reason: z
    .string()
    .max(1000, 'reason cannot exceed 1000 characters')
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(1000, 'notes cannot exceed 1000 characters')
    .optional()
    .nullable(),
}).refine(
  (data) => data.appointment_date || data.starts_at,
  {
    message: 'Either appointment_date or starts_at must be provided',
    path: ['appointment_date'],
  }
);

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

// ─── Update Status ─────────────────────────────────────────────────────────────
export const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show'] as const, {
    error: 'status must be one of: pending, confirmed, scheduled, completed, cancelled, no_show',
  }),
  notes: z.string().max(1000, 'notes cannot exceed 1000 characters').optional().nullable(),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ─── Reschedule Appointment ──────────────────────────────────────────────────
export const rescheduleAppointmentSchema = z.object({
  doctor_id: z.number().int().positive().optional(),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_slot: z.string().max(50).optional(),
  starts_at: z.string().datetime().optional(),
  reason: z.string().max(1000).optional(),
});

export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
