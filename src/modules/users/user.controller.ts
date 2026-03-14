import type { RequestHandler } from 'express';
import * as userService from './user.service';
import { asyncHandler } from '../../common/utils/asyncHandler';

export const getUsers: RequestHandler = asyncHandler(async (_req, res) => {
  const users = await userService.getAllUsers();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: users,
  });
});

export const getUser: RequestHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const user = await userService.getUserById(id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

export const updateUser: RequestHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const updated = await userService.updateUser(id, req.body);

  if (!updated) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }

  res.status(200).json({
    status: 'success',
    data: updated,
  });
});

export const deactivateUser: RequestHandler = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);

  const user = await userService.deactivateUser(id);

  if (!user) {
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }
  res.status(200).json({
    status: 'success',
    message: 'User deactivated successfully',
    data: user,
  });
});
