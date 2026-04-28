import { z } from 'zod';

export const updateDoctorSchema = z.object({
  specialization: z.string().trim().optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').trim().optional(),
  years_of_experience: z.number().int('years_of_experience must be an integer').positive('years_of_experience must be positive').optional(),
  consultation_fee: z.number().positive('consultation_fee must be positive').optional(),
  department_id: z.number().int().positive().optional(),
}).strip();

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
