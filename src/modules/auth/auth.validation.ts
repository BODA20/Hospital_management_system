import { z } from 'zod';
import { passwordSchema } from '../users/users.validation';
export const signupSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema,
    role: z.enum(['admin', 'doctor', 'nurse', 'patient']),
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
export type SignupDTO = z.infer<typeof signupSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
export type ChangePasswordDTO = z.infer<typeof changePasswordSchema>;
