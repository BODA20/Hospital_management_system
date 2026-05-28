const stripSensitive = (user: any) => {
  if (!user) return user;
  const { password_hash, password_reset_token, password_reset_expires, email_change_token, ...safeUser } = user;
  return safeUser;
};

import { appError } from '../../../common/errors/AppError';
import * as userRepo from '../repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import db from '../../../config/db';
import { invalidateUserCache } from '../../../common/utils/userCache';

export const getAllUsers = async () => {
  const users = await userRepo.findAllUsers();
  return users.map(stripSensitive);
};

export const getUserById = async (id: number) => {
  const user = await userRepo.findUserById(id);

  if (!user) {
    throw new appError('User not found', 404);
  }

  return stripSensitive(user);
};

export const updateProfile = async (
  userId: number,
  data: {
    full_name?: string;
    phone?: string;
  },
) => {
  const user = await userRepo.updateUserById(userId, data);
  // Invalidate cache on profile update as well just in case (e.g. name change in logs/audit)
  invalidateUserCache(userId);
  return stripSensitive(user);
};

export const deactivateUser = async (id: number) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  const user = await userRepo.deactivateUser(id);
  // CRITICAL: Invalidate cache so they are blocked on the next request
  invalidateUserCache(id);
  return stripSensitive(user);
};

export const adminUpdateUser = async (
  id: number,
  data: { full_name?: string; role?: string; is_active?: boolean; specialization?: string },
) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  let result;
  if (data.role === 'doctor' && existing.role !== 'doctor') {
    try {
      result = await db.transaction(async (trx) => {
        const user = await userRepo.adminUpdateUser(id, data, trx);

        const existingDoc = await doctorRepo.findByUserId(id, trx);
        if (!existingDoc) {
          await doctorRepo.createDoctor({
            user_id: id,
            specialization: data.specialization || 'General',
            years_of_experience: 0,
            bio: '',
            consultation_fee: 0,
          }, trx);
        }

        return stripSensitive(user);
      });
    } catch (error: any) {
      throw new appError(error.message || 'Failed to provision doctor profile', 500);
    }
  } else {
    result = await userRepo.adminUpdateUser(id, data);
  }

  // Invalidate cache if role or active status changed
  invalidateUserCache(id);
  return stripSensitive(result);
};

