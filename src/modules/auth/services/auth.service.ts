import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { appError } from '../../../common/errors/AppError';
import type { PublicUser } from '../../users/user.types';
import type { ChangePasswordDTO, LoginDTO, SignupDTO } from '../auth.validation';
import * as usersRepo from '../../users/repositories/user.repo';
import * as authRepo from '../repositories/auth.repo';
import crypto from 'crypto';
import { Email } from '../../../common/utils/email';
import * as sessionService from './session.service';
import db from '../../../config/db';
import * as patientRepo from '../../patients/repositories/patient.repository';
import * as cache from '../../../common/services/redisCache.service';
import { buildBlacklistKey, buildAuthUserKey, ACCESS_TOKEN_TTL_SECONDS } from '../../../common/middleware/auth';

function signToken(payload: { id: number; role: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not defined');

  return jwt.sign(payload, secret, {
    expiresIn: '15m',
  });
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) {
    throw new appError('Refresh token is required', 400);
  }

  // Rotate session returns the new refresh token and the user ID
  const { userId, refreshToken: newToken } = await sessionService.rotateSession(refreshToken);

  // Re-fetch the user to get the current role (role may have changed since last login)
  const user = await usersRepo.findUserById(userId);
  if (!user) throw new appError('User not found', 404);

  const accessToken = signToken({ id: userId, role: user.role });

  return {
    accessToken,
    refreshToken: newToken,
  };
}

export async function signup(dto: SignupDTO) {
  const existing = await usersRepo.findUserByEmail(dto.email);
  if (existing) throw new appError('Email already in use', 409);

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const password_hash = await bcrypt.hash(dto.password, rounds);

  const user = await db.transaction(async (trx) => {
    const newUser = await usersRepo.createUser(
      {
        full_name: dto.full_name,
        email: dto.email,
        password_hash,
        phone: dto.phone,
      },
      trx,
    );

    await patientRepo.createBasePatient(newUser.id, trx);
    return newUser;
  });

  return {
    message: 'User created successfully, please log in',
    user,
  };
}

export async function login(
  dto: LoginDTO,
): Promise<{ accessToken: string; user: PublicUser; refreshToken: string }> {

  console.log('[DEBUG LOGIN] Attempting login for:', dto.email);
  const user = await usersRepo.findUserByEmail(dto.email);
  
  if (!user) {
    console.log('[DEBUG LOGIN] User not found in DB for email:', dto.email);
    throw new appError('Invalid email or password', 401);
  }
  
  console.log('[DEBUG LOGIN] User found:', { id: user.id, email: user.email, role: user.role, is_active: user.is_active });

  if (!user.is_active) throw new appError('Account is deactivated', 403);

  const ok = await bcrypt.compare(dto.password, user.password_hash);
  console.log('[DEBUG LOGIN] bcrypt.compare result for', dto.email, ':', ok);

  if (!ok) throw new appError('Invalid email or password', 401);

  const accessToken = signToken({ id: user.id, role: user.role });

  const { refreshToken } = await sessionService.createSession(user.id);


  const publicUser: PublicUser = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    phone: user.phone,
  };

  return { accessToken, refreshToken, user: publicUser };
}

// ── Password-Reset Token TTL ──────────────────────────────────────────────────
// 15 minutes is the industry standard for one-time password reset links.
const PASSWORD_RESET_TTL_SECONDS = 15 * 60; // 900 s

/**
 * Builds a namespaced Redis key for a password-reset token.
 * Using a prefix prevents accidental key collisions with other features.
 */
function buildResetKey(hashedToken: string): string {
  return `pwd_reset:${hashedToken}`;
}

export const forgotPassword = async (email: string) => {
  const user = await usersRepo.findUserByEmail(email);
  if (!user) {
    // Return a generic message to prevent email enumeration attacks
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  // Generate a cryptographically random raw token (sent in the email URL)
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Hash before storage — never persist raw tokens
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Store { userId } in Redis under the hashed token key with a strict TTL.
  // This replaces the password_reset_token / password_reset_expires DB columns
  // with ephemeral Redis state, keeping the users table clean.
  await cache.set(
    buildResetKey(hashedToken),
    { userId: user.id },
    PASSWORD_RESET_TTL_SECONDS,
  );

  const resetURL = `${process.env.APP_URL}/reset-password/${resetToken}`;

  await new Email(
    { email: user.email, name: user.full_name },
    resetURL,
  ).sendPasswordReset();

  return { message: 'If that email is registered, a reset link has been sent.' };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Look up the userId stored in Redis for this hashed token.
  // `get` returns null if the key doesn't exist or has expired (TTL elapsed).
  const payload = await cache.get<{ userId: number }>(buildResetKey(hashedToken));

  if (!payload) {
    throw new appError('Token invalid or expired', 400);
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const hashedPassword = await bcrypt.hash(newPassword, rounds);

  // UpdatePassword also sets password_change_at, which invalidates existing JWTs
  await authRepo.UpdatePassword(payload.userId, hashedPassword);

  // Explicitly delete the Redis key so the token cannot be replayed
  await cache.del(buildResetKey(hashedToken));

  // Invalidate the user cache so the new password_change_at takes effect
  await cache.del(buildAuthUserKey(payload.userId));
};

const EMAIL_CHANGE_TTL_SECONDS = 60 * 60; // 1 hour

function buildEmailChangeKey(hashedToken: string): string {
  return `email_change:${hashedToken}`;
}

export const requestChangeEmail = async (userId: number, newEmail: string) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  await cache.set(
    buildEmailChangeKey(hashedToken),
    { userId, newEmail },
    EMAIL_CHANGE_TTL_SECONDS,
  );

  const verifyURL = `${process.env.APP_URL}/api/users/verify-email/${token}`;

  await new Email(
    { email: newEmail },
    verifyURL,
  ).sendEmailChangeVerification();

  return { message: 'Verification email sent' };
};

export const verifyNewEmail = async (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const payload = await cache.get<{ userId: number; newEmail: string }>(buildEmailChangeKey(hashedToken));

  if (!payload) {
    throw new appError('Token invalid or expired', 400);
  }

  await usersRepo.updateEmail(payload.userId, payload.newEmail);
  await cache.del(buildEmailChangeKey(hashedToken));
};

/**
 * Logs the user out by:
 * 1. Blacklisting the current access token in Redis (TTL = remaining token lifetime)
 * 2. Revoking the refresh token session from Redis
 *
 * @param refreshToken - The opaque refresh token from the client body.
 * @param accessToken  - The raw Bearer token from the Authorization header.
 */
export async function logout(refreshToken: string, accessToken: string) {
  if (!refreshToken) {
    throw new appError('Refresh token is required', 400);
  }

  // 1. Blacklist the access token so it is rejected by the protect middleware
  //    immediately, even before it expires naturally.
  if (accessToken) {
    await cache.set(
      buildBlacklistKey(accessToken),
      '1',                        // value is irrelevant — existence is the signal
      ACCESS_TOKEN_TTL_SECONDS,   // TTL matches the access token lifetime (15 min)
    );
  }

  // 2. Revoke the refresh token from the DB so it cannot be rotated.
  await sessionService.revokeSession(refreshToken);

  return { message: 'Logged out successfully' };
}

export async function changePassword(userId: number, dto: ChangePasswordDTO) {
  const user = await usersRepo.findUserWithPasswordById(userId);
  if (!user) {
    throw new appError('User not found', 404);
  }

  const ok = await bcrypt.compare(dto.currentPassword, user.password_hash);
  if (!ok) {
    throw new appError('Current password is incorrect', 401);
  }

  if (dto.currentPassword === dto.newPassword) {
    throw new appError('New password must be different', 400);
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const hashedPassword = await bcrypt.hash(dto.newPassword, rounds);

  await authRepo.changepassword(userId, hashedPassword);
  await sessionService.revokeAllUserSessions(userId);

  // Invalidate cache so the new password_change_at takes effect immediately
  await cache.del(buildAuthUserKey(userId));
}

