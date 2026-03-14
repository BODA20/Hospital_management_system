import type { RequestHandler } from 'express';
import * as authService from './auth.service';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { appError } from '../../common/errors/AppError';

export const signup: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.signup(req.body);
  res.status(201).json({ status: 'success', ...result });
});

export const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ status: 'success', ...result });
});

export const forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
  const resetURL = await authService.forgotPassword(req.body.email as string);
  res.status(200).json({
    status: 'success',
    message: 'Reset link sent to email',
    resetURL,
  });
});

export const resetPassword: RequestHandler = asyncHandler(async (req, res) => {
  await authService.resetPassword(
    req.params.token as string,
    req.body.newPassword as string,
  );
  res
    .status(200)
    .json({ status: 'success', message: 'Password reset successful' });
});

export const requestChangeEmail: RequestHandler = asyncHandler(
  async (req, res, next) => {
    const userId = req.user!.id;
    if (!req.body.newEmail)
      return next(new appError('Please provide a new email', 400));
    const verifyURL = await authService.requestChangeEmail(
      userId,
      req.body.newEmail as string,
    );

    res.status(200).json({
      status: 'success',
      message: 'Verification link sent to your new email',
      verifyURL,
    });
  },
);

export const verifyNewEmail: RequestHandler = asyncHandler(async (req, res) => {
  await authService.verifyNewEmail(req.params.token as string);
  res.status(200).json({
    status: 'success',
    message: 'Email verified and updated successfully',
  });
});

export const updateProfile: RequestHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const updatedUser = await authService.updateProfile(userId, req.body);

  res.status(200).json({ status: 'success', user: updatedUser });
});
