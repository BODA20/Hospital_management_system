import type { ErrorRequestHandler } from 'express';
import { appError } from '../errors/AppError';
import logger from '../utils/logger';

interface PgError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  column?: string;
}

/**
 * Parses a PostgreSQL unique violation (23505)
 * into a friendly field name.
 */
const extractFieldFromPgUniqueError = (err: PgError): string => {

  // Example:
  // Key (email)=(test@gmail.com) already exists.

  if (err.detail) {

    const match = err.detail.match(/Key \(([^)]+)\)/);

    if (match?.[1]) {

      return match[1]
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  // Fallback from constraint name
  // Example:
  // users_email_unique -> Email

  if (err.constraint) {

    const cleaned = err.constraint
      .replace(/_(unique|key|idx|pkey)$/i, '')
      .replace(/^[^_]+_/, '');

    return cleaned
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return 'Value';
};

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  _next
) => {

  const isProd = process.env.NODE_ENV === 'production';

  logger.error(
    err instanceof Error
      ? err.message
      : 'Unknown error',
    {
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      validationErrors: (err as any).errors ? JSON.stringify((err as any).errors) : undefined,
      pgCode: (err as PgError).code,
      stack:
        !isProd && err instanceof Error
          ? err.stack
          : undefined,
    }
  );

  const pgErr = err as PgError;

  if (pgErr.code === '23505') {

    const field = extractFieldFromPgUniqueError(pgErr);

    return res.status(409).json({
      status: 'fail',

      message:
        `This ${field} is already in use. ` +
        `Please choose a different one.`,
    });
  }

  if (pgErr.code === '23503') {

    return res.status(400).json({
      status: 'fail',

      message:
        'Referenced record does not exist. ' +
        'Check your IDs and try again.',
    });
  }

  if (pgErr.code === '23502') {

    const col = pgErr.column ?? 'field';

    return res.status(400).json({
      status: 'fail',

      message:
        `The field "${col}" is required ` +
        `and cannot be empty.`,
    });
  }

  if (err instanceof appError || (err && typeof (err as any).statusCode === 'number')) {
    const statusCode = (err as any).statusCode || 500;
    const status = (err as any).status || (`${statusCode}`.startsWith('4') ? 'fail' : 'error');

    return res.status(statusCode).json({

      status,

      message: err.message,

      ...((err as any).requiresVerification
        ? { requiresVerification: true }
        : {}),

      ...((err as any).errors
        ? { errors: (err as any).errors }
        : {}),

      ...(isProd
        ? {}
        : { stack: err.stack }),
    });
  }

  const message =
    !isProd &&
    err instanceof Error
      ? err.message
      : 'Internal Server Error';

  return res.status(500).json({

    status: 'error',

    message: isProd
      ? 'Something went wrong. Please try again later.'
      : message,

    ...(isProd
      ? {}
      : {
          stack:
            err instanceof Error
              ? err.stack
              : undefined,
        }),
  });
};