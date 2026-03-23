import { appError } from '../../../common/errors/AppError';
import * as userRepo from '../repositories/user.repo';
import { UserRole } from '../user.types';

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
    name?: string;
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
