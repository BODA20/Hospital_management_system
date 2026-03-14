import type { RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { appError } from '../errors/AppError';

type Where = 'body' | 'params' | 'query';

function formatZod(err: ZodError) {
  return err.issues.map((i) => ({
    path: i.path.join('.') || 'root',
    message: i.message,
  }));
}

export const validate =
  (schema: ZodSchema, where: Where = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse((req as any)[where]);

    if (!result.success) {
      const formattedErrors = formatZod(result.error);
      console.log('Zod Validation Errors:', formattedErrors);

      return next(new appError('Validation Error', 400, formattedErrors));
    }

    (req as any)[where] = result.data;
    next();
  };
