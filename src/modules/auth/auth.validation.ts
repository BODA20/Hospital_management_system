import { z } from 'zod';
import { passwordSchema } from '../users/users.validation';
export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    role: z.enum(['admin', 'doctor', 'nurse', 'patient']),
    phone: z
      .string()
      .trim()
      .regex(/^(\+)?\d+$/, 'Phone must contain only digits and an optional "+" prefix')
      .min(10, 'Phone must be at least 10 characters')
      .max(20, 'Phone must be at most 20 characters')
      .optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .strict();
export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  })
  .strict();

export const changeEmailSchema = z
  .object({
    newEmail: z.string().trim().toLowerCase().email(),
  })
  .strict();

export type SignupDTO = z.infer<typeof signupSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type RefreshDTO = z.infer<typeof refreshSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
export type ChangeEmailDTO = z.infer<typeof changeEmailSchema>;
