import { appError } from '../../common/errors/AppError';
import * as userRepo from './user.repo';
import { UserRole } from './user.types';

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

export const updateUser = async (
  id: number,
  data: { name?: string; role?: UserRole; is_active?: boolean },
) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  return userRepo.updateUserById(id, data);
};

export const deactivateUser = async (id: number) => {
  const existing = await userRepo.findUserById(id);

  if (!existing) {
    throw new appError('User not found', 404);
  }

  return userRepo.deactivateUser(id);
};
