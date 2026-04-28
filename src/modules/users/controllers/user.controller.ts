import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import type { AdminUpdateUserDTO } from '../users.validation';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: users,
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await userService.getUserById(id);

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const updateData = req.body;

  const updatedUser = await userService.updateProfile(userId, updateData);

  res.status(200).json({
    status: 'success',
    data: updatedUser,
  });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await userService.deactivateUser(id);

  res.status(200).json({
    status: 'success',
    message: 'User deactivated successfully',
    data: user,
  });
});

export const adminUpdateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updateData = req.body as AdminUpdateUserDTO;

  const user = await userService.adminUpdateUser(id, updateData);

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: user,
  });
});
