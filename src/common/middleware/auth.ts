import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { appError } from '../errors/AppError';
import * as usersRepo from '../../modules/users/repositories/user.repo';
import { getCachedUser, setCachedUser } from '../utils/userCache';

type JwtPayload = {
  id: number;
  role: string;
  iat: number;
  exp: number;
};

export const protect: RequestHandler = async (req, _res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return next(new appError('You are not logged in', 401));
    }

    const token = auth.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is missing from environment');

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // ── Cache-first lookup: avoids a DB round-trip on every request ───────────
    let cached = getCachedUser(decoded.id);

    if (!cached) {
      // Cache miss — fetch minimal auth fields from DB and populate cache
      const dbUser = await usersRepo.findUserForAuth(decoded.id);

      if (!dbUser) {
        return next(
          new appError('The user belonging to this token no longer exists', 401),
        );
      }

      setCachedUser({
        id: dbUser.id,
        role: dbUser.role,
        is_active: dbUser.is_active,
        password_change_at: dbUser.password_change_at,
      });

      cached = getCachedUser(decoded.id)!;
    }

    // ── Security checks using cached data ──────────────────────────────────────

    // 1. Account must be active
    if (!cached.is_active) {
      return next(new appError('This account is deactivated', 403));
    }

    // 2. Token must have been issued AFTER the last password change
    if (cached.password_change_at) {
      const changedTimestamp = Math.floor(
        new Date(cached.password_change_at).getTime() / 1000,
      );
      if (decoded.iat < changedTimestamp) {
        return next(
          new appError(
            'User recently changed password! Please log in again.',
            401,
          ),
        );
      }
    }

    (req as any).user = {
      id: cached.id,
      role: cached.role,
    };

    next();
  } catch (e) {
    next(new appError('Invalid or expired token', 401));
  }
};

export const restrictTo = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    const userRole = (req as any).user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return next(
        new appError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

