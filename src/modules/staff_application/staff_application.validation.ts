import { z } from 'zod';

export const createStaffApplicationBodySchema = z.object({
  requested_role: z.enum(['doctor', 'nurse', 'receptionist'], {
    message: 'Invalid role selected, must be doctor, nurse, or receptionist',
  }),
  specialization_notes: z.string().optional(),
  requested_shift: z.enum(['Morning', 'Night'], {
    message: 'Invalid shift selected, must be Morning or Night',
  }),
});

export const updateStaffApplicationBodySchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    message: 'Status must be approved or rejected',
  }),
  rejection_reason: z.string().min(5, 'Rejection reason must be at least 5 characters long').optional(),
});

export const applicationIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});
