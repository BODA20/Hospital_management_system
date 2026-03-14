import type { ErrorRequestHandler } from 'express';
import { appError } from '../errors/AppError';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log('Reached Error Handler!');
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    console.error('🔥 ORIGINAL ERROR:', err);
  }

  let error: appError;

  if (err instanceof appError) {
    error = err;
  } else {
    const message =
      !isProd && err?.message ? err.message : 'Internal Server Error';
    error = new appError(message, 500);
  }

  res.status(error.statusCode).json({
    status: error.status,
    message:
      isProd && error.statusCode === 500
        ? 'Something went wrong'
        : error.message,

    errors: error.errors || undefined,
    ...(isProd ? {} : { stack: err?.stack || error.stack }),
  });
};
