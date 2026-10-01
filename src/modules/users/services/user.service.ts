const stripSensitive = (user: any) => {
  if (!user) return user;
  const { password_hash, password_reset_token, password_reset_expires, email_change_token, ...safeUser } = user;
  return safeUser;
};

import { appError } from '../../../common/errors/AppError';
import * as userRepo from '../repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import db from '../../../config/db';
import * as cache from '../../../common/services/redisCache.service';
import { buildAuthUserKey } from '../../../common/middleware/auth';

export const getAllUsers = async () => {
  const users = await userRepo.getAllUsersWithDepartments();
  return users.map(stripSensitive);
};

export const getUserById = async (id: number) => {
  const user = await userRepo.findUserByIdWithDepartment(id);

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
    phone_number?: string;
    license_number?: string | null;
  },
) => {
  const phoneVal = data.phone || data.phone_number;
  const { license_number, phone_number, ...userData } = data;
  if (phoneVal) userData.phone = phoneVal;
  const user = await userRepo.updateUserById(userId, userData);

  if (license_number !== undefined) {
    if (user.role === 'doctor') {
      await db('doctors').where({ user_id: userId }).update({ license_number, updated_at: db.fn.now() });
    } else if (user.role === 'nurse') {
      await db('nurses').where({ user_id: userId }).update({ license_number, updated_at: db.fn.now() });
    }
  }

  if (phoneVal && user.role === 'patient') {
    await db('patients').where({ user_id: userId }).update({ phone: phoneVal, updated_at: db.fn.now() });
  }

  // Invalidate cache on profile update as well just in case (e.g. name change in logs/audit)
  await cache.del(buildAuthUserKey(userId));
  return getUserById(userId);
};

export const deactivateUser = async (id: number) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  const user = await userRepo.deactivateUser(id);
  // CRITICAL: Invalidate cache so they are blocked on the next request
  await cache.del(buildAuthUserKey(id));
  return stripSensitive(user);
};

export const adminUpdateUser = async (
  id: number,
  data: { full_name?: string; role?: string; is_active?: boolean; specialization?: string; license_number?: string | null; phone?: string | null; assigned_shift?: 'Morning' | 'Night' },
) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  const { license_number, specialization, ...userUpdateData } = data;

  let result;
  if (data.role === 'doctor' && existing.role !== 'doctor') {
    try {
      result = await db.transaction(async (trx) => {
        const user = await userRepo.adminUpdateUser(id, userUpdateData, trx);

        const existingDoc = await doctorRepo.findByUserId(id, trx);
        if (!existingDoc) {
          await doctorRepo.createDoctor({
            user_id: id,
            specialization: specialization || 'General',
            years_of_experience: 0,
            bio: '',
            consultation_fee: 0,
            department_id: null as any,
          }, trx);
        }

        return user;
      });
    } catch (error: any) {
      throw new appError(error.message || 'Failed to provision doctor profile', 500);
    }
  } else {
    result = await userRepo.adminUpdateUser(id, userUpdateData);
  }

  if (license_number !== undefined) {
    const targetRole = data.role || existing.role;
    if (targetRole === 'doctor') {
      await db('doctors').where({ user_id: id }).update({ license_number, updated_at: db.fn.now() });
    } else if (targetRole === 'nurse') {
      await db('nurses').where({ user_id: id }).update({ license_number, updated_at: db.fn.now() });
    }
  }

  // Invalidate cache if role or active status changed
  await cache.del(buildAuthUserKey(id));
  return getUserById(id);
};

