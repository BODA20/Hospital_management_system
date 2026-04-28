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
    const result = schema.safeParse((req as any)[where] ?? {});
    if (!result.success) {
      const formattedErrors = formatZod(result.error);
      return next(new appError('Validation Error', 400, formattedErrors));
    }

    // req.query is a read-only getter in Express 5 — use defineProperty to override safely
    if (where === 'query') {
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    } else {
      (req as any)[where] = result.data;
    }
    next();
  };

