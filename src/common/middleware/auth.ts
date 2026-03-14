import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { appError } from '../errors/AppError';
import * as usersRepo from '../../modules/users/user.repo';

type JwtPayload = {
  id: number;
  role: string;
  iat: number;
  exp: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: string };
    }
  }
}

export const protect: RequestHandler = async (req, _res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return next(new appError('You are not logged in', 401));
    }

    const token = auth.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is missing from .env');

    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await usersRepo.findUserById(decoded.id);

    if (!user) {
      return next(
        new appError('The user belonging to this token no longer exists', 401),
      );
    }
    if (user.password_change_at) {
      const changedTimestamp = Math.floor(
        user.password_change_at.getTime() / 1000,
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

    if (!user.is_active) {
      return next(new appError('This account is deactivated', 403));
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (e) {
    next(new appError('Invalid or expired token', 401));
  }
};

export const restrictTo = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return next(
        new appError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};
