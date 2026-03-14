import bcrypt from 'bcrypt';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { appError } from '../../common/errors/AppError';
import type { PublicUser } from '../users/user.types';
import type { LoginDTO, SignupDTO } from './auth.validation';
import * as usersRepo from '../users/user.repo';
import crypto from 'crypto';
import { Email } from '../../common/utils/email';
function signToken(payload: { id: number; role: string }) {
  const secret = process.env.JWT_SECRET as Secret;

  if (!secret) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined in .env file');
  }

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
}

export async function signup(
  dto: SignupDTO,
): Promise<{ token: string; user: PublicUser }> {
  const existing = await usersRepo.findUserByEmail(dto.email);
  if (existing) throw new appError('Email already in use', 409);

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const password_hash = await bcrypt.hash(dto.password, rounds);

  const user = await usersRepo.createUser({
    name: dto.name,
    email: dto.email,
    role: dto.role,
    password: password_hash,
  });

  const token = signToken({ id: user.id, role: user.role });

  return { token, user };
}

export async function login(
  dto: LoginDTO,
): Promise<{ token: string; user: PublicUser }> {
  const user = await usersRepo.findUserByEmail(dto.email);

  if (!user) throw new appError('Invalid email or password', 401);

  if (!user.is_active) throw new appError('Account is deactivated', 403);

  const ok = await bcrypt.compare(dto.password, user.password);
  if (!ok) throw new appError('Invalid email or password', 401);

  const token = signToken({ id: user.id, role: user.role });

  const publicUser: PublicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
  };

  return { token, user: publicUser };
}

export const forgotPassword = async (email: string) => {
  const user = await usersRepo.findUserByEmail(email);

  if (!user) {
    throw new appError('User not found', 404);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  const expires = new Date();
  expires.setHours(expires.getHours() + 1);

  await usersRepo.saveResetToken(user.id, hashedToken, expires);

  const resetURL = `${process.env.APP_URL}/reset-password/${resetToken}`;

  await new Email(
    { email: user.email, name: user.name },
    resetURL,
  ).sendPasswordReset();

  return { message: 'Password reset email sent' };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await usersRepo.findByResetToken(hashedToken);

  if (!user) {
    throw new appError('Token invalid or expired', 400);
  }

  if (new Date() > user.password_reset_expires!) {
    throw new appError('Token has expired', 400);
  }
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);
  const hashedPassword = await bcrypt.hash(newPassword, rounds);

  await usersRepo.UpdatePassword(user.id, hashedPassword);
  await usersRepo.ClearResetToken(user.id);
};

export const requestChangeEmail = async (userId: number, newEmail: string) => {
  const token = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const expires = new Date();
  expires.setHours(expires.getHours() + 1);

  await usersRepo.saveEmailChangeToken(userId, newEmail, hashedToken, expires);

  const verifyURL = `http://localhost:3000/api/users/verify-email/${token}`;

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

export const updateProfile = async (
  userId: number,
  data: {
    name?: string;
    phone?: string;
  },
) => {
  const user = await usersRepo.updateUserById(userId, data);

  return user;
};
