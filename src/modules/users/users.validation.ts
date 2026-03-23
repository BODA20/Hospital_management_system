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
    name: z
      .string()
      .trim()
      .min(2, 'Name is too short')
      .max(100, 'Name is too long'),
    email: z.string().trim().toLowerCase().email('Invalid email'),
    password: passwordSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    is_active: z.boolean().optional(),
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
