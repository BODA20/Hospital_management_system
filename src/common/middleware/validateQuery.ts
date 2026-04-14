import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Extend Express Request to carry the validated & typed query.
 * Express 5 makes req.query read-only, so we use a dedicated property.
 */
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: any;
    }
  }
}

/**
 * Generic Express middleware that validates `req.query` against a Zod schema.
 * On success the parsed (typed) result is attached to `req.validatedQuery`.
 * On failure a 400 JSON response is returned with field-level errors.
 */
export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      req.validatedQuery = parsed;
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        const formatted = err.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        res.status(400).json({
          status: 'fail',
          message: 'Invalid query parameters',
          errors: formatted,
        });
        return;
      }
      next(err);
    }
  };
