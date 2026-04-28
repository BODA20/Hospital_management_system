import type { ErrorRequestHandler } from 'express';
import { appError } from '../errors/AppError';

// ─── PostgreSQL unique violation error shape ───────────────────────────────────
interface PgError extends Error {
  code?: string;       // e.g. '23505'
  detail?: string;     // e.g. 'Key (email)=(foo@bar.com) already exists.'
  constraint?: string; // e.g. 'users_email_unique'
}

/**
 * Parses a PostgreSQL unique violation (23505) into a friendly field name.
 *
 * PG provides two useful strings:
 *  - detail:     "Key (email)=(foo@bar.com) already exists."
 *  - constraint: "users_email_unique" / "nurses_license_number_unique"
 *
 * Strategy: prefer `detail` (most explicit), fall back to `constraint`.
 */
const extractFieldFromPgUniqueError = (err: PgError): string => {
  // 1. Try to extract from detail: "Key (field_name)=(...)"
  if (err.detail) {
    const match = err.detail.match(/Key \(([^)]+)\)/);
    if (match?.[1]) {
      // Convert snake_case to Title Case for friendliness
      return match[1]
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  // 2. Fall back to constraint name: strip table prefix, e.g. "users_email_unique" → "Email"
  if (err.constraint) {
    // Remove trailing _unique / _key / _idx
    const cleaned = err.constraint
      .replace(/_(unique|key|idx|pkey)$/i, '')
      // Remove leading table name (first segment before underscore)
      .replace(/^[^_]+_/, '');
    return cleaned
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return 'Value';
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
     // console.error('🔥 ERROR:', err);
  }

  // ─── PostgreSQL: Unique Constraint Violation (23505) ──────────────────────────
  const pgErr = err as PgError;
  if (pgErr.code === '23505') {
    const field = extractFieldFromPgUniqueError(pgErr);
    return res.status(409).json({
      status: 'fail',
      message: `This ${field} is already in use. Please choose a different one.`,
    });
  }

  // ─── PostgreSQL: Foreign Key Violation (23503) ────────────────────────────────
  if (pgErr.code === '23503') {
    return res.status(400).json({
      status: 'fail',
      message: 'Referenced record does not exist. Check your IDs and try again.',
    });
  }

  // ─── PostgreSQL: Not Null Violation (23502) ───────────────────────────────────
  if (pgErr.code === '23502') {
    const col = (err as any).column ?? 'field';
    return res.status(400).json({
      status: 'fail',
      message: `The field "${col}" is required and cannot be empty.`,
    });
  }

  // ─── Known application error (appError) ───────────────────────────────────────
  if (err instanceof appError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
      ...(isProd ? {} : { stack: err.stack }),
    });
  }

  // ─── Unknown / unhandled error ────────────────────────────────────────────────
  const message = !isProd && err?.message ? err.message : 'Internal Server Error';
  return res.status(500).json({
    status: 'error',
    message: isProd ? 'Something went wrong. Please try again later.' : message,
    ...(isProd ? {} : { stack: err?.stack }),
  });
};
