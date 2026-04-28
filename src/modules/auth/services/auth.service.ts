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
import { invalidateUserCache } from '../../../common/utils/userCache';

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

  const { userId } = await sessionService.rotateSession(refreshToken);

  // Re-fetch the user to get the current role (role may have changed since last login)
  const user = await usersRepo.findUserById(userId);
  if (!user) throw new appError('User not found', 404);

  const accessToken = signToken({ id: userId, role: user.role });
  const { refreshToken: newToken } = await sessionService.rotateSession(refreshToken);

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
  const user = await usersRepo.findUserByEmail(dto.email);

  if (!user) throw new appError('Invalid email or password', 401);
  if (!user.is_active) throw new appError('Account is deactivated', 403);

  const ok = await bcrypt.compare(dto.password, user.password_hash);
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
  };

  return { accessToken, refreshToken, user: publicUser };
}

export const forgotPassword = async (email: string) => {
  const user = await usersRepo.findUserByEmail(email);
  if (!user) {
    // Return generic message to prevent email enumeration
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const expires = new Date();
  expires.setHours(expires.getHours() + 1);

  await authRepo.saveResetToken(user.id, hashedToken, expires);

  const resetURL = `${process.env.APP_URL}/reset-password/`;

  await new Email(
    { email: user.email, name: user.full_name },
    resetURL,
  ).sendPasswordReset();

  return { message: 'If that email is registered, a reset link has been sent.' };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await authRepo.findByResetToken(hashedToken);

  if (!user) {
    throw new appError('Token invalid or expired', 400);
  }

  if (new Date() > user.password_reset_expires!) {
    throw new appError('Token has expired', 400);
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const hashedPassword = await bcrypt.hash(newPassword, rounds);

  await authRepo.UpdatePassword(user.id, hashedPassword);
  await authRepo.ClearResetToken(user.id);

  // Invalidate the cache so the new password_change_at is picked up immediately
  invalidateUserCache(user.id);
};

export const requestChangeEmail = async (userId: number, newEmail: string) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const expires = new Date();
  expires.setHours(expires.getHours() + 1);

  await usersRepo.saveEmailChangeToken(userId, hashedToken, newEmail, expires);

  const verifyURL = `${process.env.APP_URL}/api/users/verify-email/`;

  await new Email(
    { email: newEmail, name: '' },
    verifyURL,
  ).sendEmailChangeVerification();

  return { message: 'Verification email sent' };
};

export const verifyNewEmail = async (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await usersRepo.findByEmailToken(hashedToken);

  if (!user) {
    throw new appError('Token invalid', 400);
  }
  if (new Date() > user.email_change_expires!) {
    throw new appError('Token has expired', 400);
  }

  await usersRepo.updateEmail(user.id, user.pending_email as string);
  await usersRepo.clearEmailChangeToken(user.id);
};

export async function logout(refreshToken: string) {
  if (!refreshToken) {
    throw new appError('Refresh token is required', 400);
  }

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
  invalidateUserCache(userId);
}

