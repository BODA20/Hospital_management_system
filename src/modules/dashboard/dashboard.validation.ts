import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Zod schema for GET /api/v1/dashboard/stats query parameters.
 *
 * Accepted combos:
 *   ?period=today | week | month | year
 *   ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *   (nothing) → defaults to period=today
 */
export const statsQuerySchema = z
  .object({
    period: z
      .enum(['today', 'week', 'month', 'year'])
      .optional(),

    startDate: z
      .string()
      .regex(dateRegex, 'Must be YYYY-MM-DD')
      .optional(),

    endDate: z
      .string()
      .regex(dateRegex, 'Must be YYYY-MM-DD')
      .optional(),
  })
  .refine(
    (d) => {
      // If one custom date is given, both must be present
      if ((d.startDate && !d.endDate) || (!d.startDate && d.endDate)) {
        return false;
      }
      return true;
    },
    { message: 'Both startDate and endDate are required for a custom range' },
  )
  .refine(
    (d) => {
      if (d.startDate && d.endDate) {
        return d.endDate >= d.startDate;
      }
      return true;
    },
    { message: 'endDate must be equal to or after startDate' },
  )
  .transform((d) => {
    // Default to "today" when nothing is supplied
    if (!d.period && !d.startDate) {
      return { ...d, period: 'today' as const };
    }
    return d;
  });

export type StatsQuery = z.infer<typeof statsQuerySchema>;
