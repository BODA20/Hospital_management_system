import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { appError } from '../errors/AppError';
import * as usersRepo from '../../modules/users/repositories/user.repo';
import * as cache from '../services/redisCache.service';

export type CachedAuthUser = {
  id: number;
  role: string;
  is_active: boolean;
};

type JwtPayload = {
  id: number;
  role: string;
  iat: number;
  exp: number;
};

// ── Access-Token Blacklist helpers ────────────────────────────────────────────
// TTL must match the actual access-token lifetime so blacklist entries expire
// exactly when the token would have anyway.  Parses JWT_EXPIRES_IN (e.g. "7d",
// "1h", "30m") into seconds; falls back to 7 days if the variable is absent.
function parseExpiresInSeconds(value: string | undefined): number {
  if (!value) return 7 * 24 * 3600;
  const match = value.match(/^(\d+)([smhd]?)$/);
  if (!match) return 7 * 24 * 3600;
  const n = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const multiplier: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (multiplier[unit] ?? 1);
}
const ACCESS_TOKEN_TTL_SECONDS = parseExpiresInSeconds(process.env.JWT_EXPIRES_IN);

export function buildBlacklistKey(token: string): string {
  return `blacklist:${token}`;
}

export function buildAuthUserKey(userId: number): string {
  return `auth_user:${userId}`;
}

export const protect: RequestHandler = async (req, _res, next) => {
  try {
    let token: string | undefined;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    } else if (req.headers['x-access-token']) {
      token = String(req.headers['x-access-token']);
    } else if (req.query?.token) {
      token = String(req.query.token);
    } else if (req.body?.token) {
      token = String(req.body.token);
    }

    if (!token) {
      return next(new appError('You are not logged in', 401));
    }

    const secret = process.env.JWT_SECRET || 'BOODa2007#';

    // ── Check if this is an appointment action token (e.g. "12.hash") ─────
    if (token.includes('.') && token.split('.').length === 2 && !isNaN(Number(token.split('.')[0]))) {
      const [apptIdStr, hash] = token.split('.');
      const apptId = Number(apptIdStr);
      const expectedHash = require('crypto')
        .createHmac('sha256', secret)
        .update(String(apptId))
        .digest('hex');
      if (hash === expectedHash) {
        (req as any).user = { id: 0, role: 'patient', is_action_token: true };
        return next();
      }
    }

    // ── 1. Fast Redis blacklist check ──────────────────────────────────────
    const isBlacklisted = await cache.exists(buildBlacklistKey(token));
    if (isBlacklisted) {
      return next(new appError('Token has been invalidated. Please log in again.', 401));
    }

    // ── 2. Verify JWT signature and expiry ─────────────────────────────────
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // ── 3. Cache-first lookup: avoids a DB round-trip on every request ──────
    let cached = await cache.get<CachedAuthUser>(buildAuthUserKey(decoded.id));

    if (!cached) {
      // Cache miss — fetch minimal auth fields from DB and populate cache
      const dbUser = await usersRepo.findUserForAuth(decoded.id);

      if (!dbUser) {
        return next(
          new appError('The user belonging to this token no longer exists', 401),
        );
      }

      cached = {
        id: dbUser.id,
        role: dbUser.role,
        is_active: dbUser.is_active,
      };

      await cache.set(buildAuthUserKey(decoded.id), cached, 60); // 60 seconds TTL
    }

    // ── 4. Security checks using cached data ───────────────────────────────

    // Account must be active
    if (!cached.is_active) {
      return next(new appError('This account is deactivated', 403));
    }

    // (password_change_at check disabled — column not yet in DB)

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

export { ACCESS_TOKEN_TTL_SECONDS };

