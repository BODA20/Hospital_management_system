import { appError } from '../../../common/errors/AppError';
import * as userRepo from '../repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import db from '../../../config/db';

export const getAllUsers = async () => {
  return userRepo.findAllUsers();
};

export const getUserById = async (id: number) => {
  const user = await userRepo.findUserById(id);

  if (!user) {
    throw new appError('User not found', 404);
  }

  return user;
};

export const updateProfile = async (
  userId: number,
  data: {
    full_name?: string;
    phone?: string;
  },
) => {
  const user = await userRepo.updateUserById(userId, data);

  return user;
};

export const deactivateUser = async (id: number) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  return userRepo.deactivateUser(id);
};

export const adminUpdateUser = async (
  id: number,
  data: { full_name?: string; role?: string; is_active?: boolean; specialization?: string },
) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  if (data.role === 'doctor' && existing.role !== 'doctor') {
    try {
      return await db.transaction(async (trx) => {
        const user = await userRepo.adminUpdateUser(id, data, trx);

        const existingDoc = await doctorRepo.findByUserId(id, trx);
        if (!existingDoc) {
          await doctorRepo.createDoctor({
            user_id: id,
            specialization: data.specialization || 'General',
            experience_years: 0,
            bio: '',
            consultation_fee: 0,
          }, trx);
        }

        return user;
      });
    } catch (error: any) {
      throw new appError(error.message || 'Failed to provision doctor profile', 500);
    }
  }

  return userRepo.adminUpdateUser(id, data);
};
