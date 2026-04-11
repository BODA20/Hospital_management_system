import { z } from 'zod';

export const addInvoiceItemSchema = z.object({
  description: z.string().trim().min(3, 'Description is too short'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .positive('Quantity must be positive'),
  unit_price: z
    .number()
    .nonnegative('Unit price cannot be negative'),
}).strip();

export const payInvoiceSchema = z.object({
  payment_method: z.enum(['cash', 'card']),
}).strip();

export const createInvoiceSchema = z.object({
  patient_id: z.number().int().positive(),
  visit_id: z.number().int().positive().optional(),
  discount: z.number().nonnegative().optional(),
  tax: z.number().nonnegative().optional(),
}).strip();
