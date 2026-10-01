import { z } from 'zod';
import type { UserRole } from './user.types';

// const roles: UserRole[] = ['admin', 'doctor', 'nurse', 'patient'];

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a symbol');

export const createUserSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name is too short')
      .max(100, 'Full name is too long'),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    password: passwordSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100).optional(),
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number is required and must be at least 7 digits')
      .max(20, 'Phone must be at most 20 characters')
      .regex(
        /^\+?[0-9][\s\-\(\)0-9]{6,19}$/,
        'Phone must be a valid number (e.g. +1 555 000 0000)',
      )
      .optional()
      .nullable(),
    phone_number: z
      .string()
      .trim()
      .min(7)
      .max(20)
      .optional()
      .nullable(),
    license_number: z.string().trim().max(100).optional().nullable(),
  })
  .strict()
  .transform((data) => {
    if (!data.phone && data.phone_number) {
      data.phone = data.phone_number;
    }
    return data;
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
    path: ['_'],
  });

const roles = ['admin', 'doctor', 'nurse', 'patient'] as const;

export const adminUpdateUserSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100).optional(),
    is_active: z.boolean().optional(),
    role: z.enum(roles).optional(),
    specialization: z.string().trim().min(2).max(100).optional(),
    license_number: z.string().trim().max(100).optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    assigned_shift: z.enum(['Morning', 'Night']).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
    path: ['_'],
  });

export const userIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
export type UserIdParamDTO = z.infer<typeof userIdParamSchema>;
export type AdminUpdateUserDTO = z.infer<typeof adminUpdateUserSchema>;
