import { z } from 'zod';

export const updateDoctorSchema = z.object({
  specialization: z.string().trim().optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').trim().optional(),
  experience_years: z.number().int('experience_years must be an integer').positive('experience_years must be positive').optional(),
  consultation_fee: z.number().positive('consultation_fee must be positive').optional(),
}).strip();

export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
