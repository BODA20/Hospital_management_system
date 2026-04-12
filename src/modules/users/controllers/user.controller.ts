import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import type { AdminUpdateUserDTO } from '../users.validation';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const updateData = req.body;

    const updatedUser = await userService.updateProfile(userId, updateData);

    res.status(200).json({
      status: 'success',
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
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
  } catch (err) {
    next(err);
  }
};

export const adminUpdateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body as AdminUpdateUserDTO;

    const user = await userService.adminUpdateUser(id, updateData);

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
