import { z } from 'zod';

// ─── Create Nurse ──────────────────────────────────────────────────────────────
export const createNurseSchema = z.object({
  user_id: z
    .number({ error: 'user_id must be a number' })
    .int('user_id must be an integer')
    .positive('user_id must be a positive integer'),

  department_id: z
    .number({ error: 'department_id must be a number' })
    .int('department_id must be an integer')
    .positive('department_id must be a positive integer'),

  doctor_id: z
    .number({ error: 'doctor_id must be a number' })
    .int('doctor_id must be an integer')
    .positive('doctor_id must be a positive integer'),

  license_number: z
    .string({ error: 'license_number must be a string' })
    .min(3, 'license_number must be at least 3 characters')
    .max(50, 'license_number cannot exceed 50 characters')
    .trim(),

  shift: z.enum(['morning', 'evening', 'night'] as const, {
    error: 'shift must be one of: morning, evening, night',
  }),

  years_of_experience: z
    .number()
    .int('years_of_experience must be an integer')
    .min(0, 'years_of_experience cannot be negative')
    .optional()
    .default(0),

  notes: z.string().max(1000, 'notes cannot exceed 1000 characters').optional(),
});

export type CreateNurseInput = z.infer<typeof createNurseSchema>;

// ─── Update Nurse (all fields optional) ───────────────────────────────────────
export const updateNurseSchema = createNurseSchema
  .omit({ user_id: true }) // user_id cannot change after creation
  .partial();

export type UpdateNurseInput = z.infer<typeof updateNurseSchema>;
