import { z } from 'zod';

// ─── Create Department ─────────────────────────────────────────────────────────
export const createDepartmentSchema = z.object({
  name: z
    .string({ error: 'Department name must be a string' })
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name cannot exceed 120 characters')
    .trim(),

  code: z
    .string({ error: 'Department code must be a string' })
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code cannot exceed 20 characters')
    .regex(
      /^[A-Z0-9_-]+$/i,
      'Code must contain only letters, numbers, underscores or hyphens',
    )
    .toUpperCase()
    .trim(),

  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),

  head_doctor_id: z
    .number()
    .int('head_doctor_id must be an integer')
    .positive('head_doctor_id must be a positive integer')
    .optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

// ─── Update Department (all fields optional) ───────────────────────────────────
export const updateDepartmentSchema = createDepartmentSchema.partial();

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
