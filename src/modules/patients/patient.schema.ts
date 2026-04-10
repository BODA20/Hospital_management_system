import { z } from 'zod';

// ─── Re-usable field definitions ───────────────────────────────────────────────
const phoneField = z
  .string({ error: 'phone must be a string' })
  .min(7, 'phone must be at least 7 characters')
  .max(30, 'phone cannot exceed 30 characters')
  .regex(/^\+?[0-9\s\-()]+$/, 'phone must be a valid phone number')
  .trim();

const genderField = z.enum(['male', 'female', 'other'] as const, {
  error: 'gender must be one of: male, female, other',
});

const bloodGroupField = z.enum(
  ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const,
  { error: 'blood_group must be a valid blood type (e.g. A+, O-, AB+)' },
);

const dateOfBirthField = z
  .string({ error: 'date_of_birth must be a string' })
  .date('date_of_birth must be a valid date in YYYY-MM-DD format')
  .refine(
    (val) => new Date(val) < new Date(),
    'date_of_birth must be in the past',
  );

// ─── Create Patient (admin creating a patient record for a user) ───────────────
export const createPatientSchema = z.object({
  user_id: z
    .number({ error: 'user_id must be a number' })
    .int('user_id must be an integer')
    .positive('user_id must be a positive integer'),

  full_name: z
    .string({ error: 'full_name must be a string' })
    .min(3, 'full_name must be at least 3 characters')
    .max(150, 'full_name cannot exceed 150 characters')
    .trim(),

  email: z
    .string({ error: 'email must be a string' })
    .email('email must be a valid email address')
    .toLowerCase()
    .trim(),

  phone: phoneField,

  gender: genderField,

  date_of_birth: dateOfBirthField,

  blood_group: bloodGroupField.optional(),

  emergency_contact: z
    .string({ error: 'emergency_contact must be a string' })
    .min(7, 'emergency_contact must be at least 7 characters')
    .max(30, 'emergency_contact cannot exceed 30 characters')
    .regex(/^\+?[0-9\s\-()]+$/, 'emergency_contact must be a valid phone number')
    .trim(),
});

export type CreatePatientDTO = z.infer<typeof createPatientSchema>;

// ─── Update Patient (patient updating their own profile) ──────────────────────
export const updatePatientSchema = z
  .object({
    phone: phoneField.optional(),
    gender: genderField.optional(),
    date_of_birth: dateOfBirthField.optional(),
    blood_group: bloodGroupField.optional(),
    emergency_contact: z
      .string()
      .min(7)
      .max(30)
      .regex(/^\+?[0-9\s\-()]+$/, 'emergency_contact must be a valid phone number')
      .trim()
      .optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdatePatientDTO = z.infer<typeof updatePatientSchema>;

// ─── Pagination Query Params ───────────────────────────────────────────────────
export const patientQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().trim().optional(),
});

export type PatientQueryDTO = z.infer<typeof patientQuerySchema>;
