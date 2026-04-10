import { z } from 'zod';

// ─── Vitals sub-object ─────────────────────────────────────────────────────────
// Exported so it can be reused in recordVitalsSchema.
export const vitalsSchema = z
  .object({
    bp: z
      .string()
      .regex(/^\d{2,3}\/\d{2,3}$/, 'bp must be in format "120/80"')
      .optional(),
    pulse: z
      .number()
      .int('pulse must be a whole number')
      .min(20, 'pulse seems too low')
      .max(300, 'pulse seems too high')
      .optional(),
    temperature: z
      .number()
      .min(30, 'temperature seems too low (°C)')
      .max(45, 'temperature seems too high (°C)')
      .optional(),
    weight: z
      .number()
      .positive('weight must be positive (kg)')
      .max(500, 'weight seems too high (kg)')
      .optional(),
  })
  .optional();

// ─── Create Visit ──────────────────────────────────────────────────────────────
export const createVisitSchema = z.object({
  patient_id: z
    .number({ error: 'patient_id must be a number' })
    .int('patient_id must be an integer')
    .positive('patient_id must be a positive integer'),

  doctor_id: z
    .number({ error: 'doctor_id must be a number' })
    .int('doctor_id must be an integer')
    .positive('doctor_id must be a positive integer'),

  appointment_id: z
    .number()
    .int('appointment_id must be an integer')
    .positive('appointment_id must be a positive integer')
    .optional(),

  reason_for_visit: z
    .string({ error: 'reason_for_visit must be a string' })
    .min(3, 'reason_for_visit must be at least 3 characters')
    .max(255, 'reason_for_visit cannot exceed 255 characters')
    .trim(),

  diagnosis: z
    .string({ error: 'diagnosis must be a string' })
    .min(3, 'diagnosis must be at least 3 characters')
    .trim(),

  treatment_plan: z.string().trim().optional(),

  notes: z.string().trim().optional(),

  vitals: vitalsSchema,

  check_in_at: z
    .string()
    .datetime({ message: 'check_in_at must be a valid ISO 8601 datetime' })
    .optional(),
});

export type CreateVisitDTO = z.infer<typeof createVisitSchema>;

// ─── Update Visit ──────────────────────────────────────────────────────────────
export const updateVisitSchema = z
  .object({
    status: z
      .enum(
        ['awaiting_vitals', 'ready_for_doctor', 'in_progress', 'completed', 'cancelled'] as const,
        { error: 'status must be one of the allowed visit statuses' },
      )
      .optional(),

    diagnosis: z.string().trim().optional(),

    treatment_plan: z.string().trim().optional(),

    notes: z.string().trim().optional(),

    vitals: vitalsSchema,

    check_out_at: z
      .string()
      .datetime({ message: 'check_out_at must be a valid ISO 8601 datetime' })
      .optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateVisitDTO = z.infer<typeof updateVisitSchema>;

// ─── Record Vitals (nurse action) ─────────────────────────────────────────────
// vitals is required (not optional) — the nurse must provide at least one value.
export const recordVitalsSchema = z
  .object({
    vitals: vitalsSchema.unwrap().refine(
      (v) => Object.keys(v).length > 0,
      { message: 'At least one vital sign must be provided' },
    ),
  })
  .strip();

export type RecordVitalsDTO = z.infer<typeof recordVitalsSchema>;
