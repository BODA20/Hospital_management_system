import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);

  res.status(201).json({
    status: 'success',
    data: result,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  const result = await authService.refresh(refreshToken);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  await authService.logout(refreshToken);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    await authService.resetPassword(token as string, password);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful',
    });
  },
);

export const verifyNewEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.params;

    await authService.verifyNewEmail(token as string);

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
    });
  },
);

export const requestChangeEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { newEmail } = req.body;

    await authService.requestChangeEmail(userId, newEmail);

    res.status(200).json({
      status: 'success',
      message:
        'Email change requested. Please check your new email for verification link.',
    });
  },
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const dto = req.body;

    await authService.changePassword(userId, dto);

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully, please login again',
    });
  },
);
