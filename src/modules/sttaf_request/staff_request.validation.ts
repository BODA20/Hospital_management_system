import { z } from 'zod';
import { UserRole } from '../users/user.types';

export const createStaffRequestBodySchema = z.object({
  role: z.nativeEnum(UserRole, {
    message: 'Invalid role selected',
  }),
});

export const staffIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});

export const approveRejectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a valid number').transform(Number),
});

export const approveRejectBodySchema = z.object({
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters long')
    .optional(),
});
