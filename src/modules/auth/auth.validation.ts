import { z } from 'zod';
import { passwordSchema } from '../users/users.validation';
export const signupSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    role: z
      .preprocess(
        (val) => (typeof val === 'string' ? val.toLowerCase() : val),
        z.enum(['admin', 'doctor', 'nurse', 'patient', 'receptionist'])
      )
      .optional()
      .default('patient'),
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number must be at least 7 digits')
      .max(20, 'Phone must be at most 20 characters')
      .regex(
        /^\+?[0-9][\s\-\(\)0-9]{6,19}$/,
        'Phone must be a valid number (e.g. +1 555 000 0000)',
      )
      .optional()
      .nullable(),
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
    current_password: z.string().min(1, 'Current password is required'),
    new_password: passwordSchema,
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

export const verifyOtpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    otp: z.string().trim().length(6, 'OTP must be 6 digits'),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
  })
  .strict();

export type SignupDTO = z.infer<typeof signupSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordDTO = z.infer<typeof forgotPasswordSchema>;
export type RefreshDTO = z.infer<typeof refreshSchema>;
export type ResetPasswordDTO = z.infer<typeof resetPasswordSchema>;
export type ChangeEmailDTO = z.infer<typeof changeEmailSchema>;
export type VerifyOtpDTO = z.infer<typeof verifyOtpSchema>;
export type ResendOtpDTO = z.infer<typeof resendOtpSchema>;
