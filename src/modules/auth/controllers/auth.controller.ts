import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import {
  ChangeEmailDTO,
  ChangePasswordDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
} from '../auth.validation';
import { logAuditEvent } from '../../audit/services/audit.service';

export const signup = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.signup(req.body);

  // Log account creation — fire-and-forget
  logAuditEvent(req, {
    action_type: 'ACCOUNT_CREATED',
    actor_name:  result.user.full_name || result.user.email,
    user_id:     result.user.id,
    description: `New account registered: ${result.user.email} (role: ${result.user.role})`,
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});

export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifyOTP(email, otp);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.resendOTP(email);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const result = await authService.login(req.body);

    // Successful login
    logAuditEvent(req, {
      action_type: 'LOGIN_SUCCESS',
      actor_name:  result.user.full_name || result.user.email,
      user_id:     result.user.id,
      description: `User ${result.user.email} logged in successfully`,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err: any) {
    // Log failed login attempt — no user_id since authentication failed
    logAuditEvent(req, {
      action_type: 'LOGIN_FAILED',
      actor_name:  email || 'unknown',
      user_id:     null,
      description: `Failed login attempt for email: ${email || 'unknown'}`,
    });
    throw err; // Re-throw so the global error handler responds with 401
  }
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

  const authHeader = req.headers.authorization ?? '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : '';

  const userId = (req.user as any)?.id;
  let actorName = 'session_logout_action';
  
  if (userId) {
    const { findUserById } = await import('../../users/repositories/user.repo');
    const userDb = await findUserById(userId);
    if (userDb) {
      actorName = userDb.full_name || userDb.email || `User ${userId}`;
    }
  }

  logAuditEvent(req, {
    action_type: 'LOGOUT',
    user_id: userId || null,
    actor_name: actorName,
    description: `User successfully logged out and cleared session tokens.`
  });

  await authService.logout(refreshToken, accessToken);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body as ForgotPasswordDTO;

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
    const { password } = req.body as ResetPasswordDTO;

    const resetResult = await authService.resetPassword(token as string, password);

    // Fetch the user record so we can log their real name/email instead of
    // falling back to the default "anonymous" actor (req.user is undefined
    // on this unauthenticated endpoint).
    const { findUserById } = await import('../../users/repositories/user.repo');
    const resetUser = await findUserById(resetResult.userId);
    const actorName  = resetUser?.full_name || resetUser?.email || `User ${resetResult.userId}`;
    const actorEmail = resetUser?.email     || `ID:${resetResult.userId}`;

    // Audit log — fire-and-forget; safe for ALL roles including patient
    logAuditEvent(req, {
      action_type: 'PASSWORD_CHANGE',
      actor_name:  actorName,
      user_id:     resetResult.userId,
      description: `Password was reset via email link for user: ${actorEmail}`,
    });

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
    const { newEmail } = req.body as ChangeEmailDTO;

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
    const dto = req.body as ChangePasswordDTO;

    await authService.changePassword(userId, dto);

    // Safe cast to access extended user properties
    const currentUser = req.user as any;

    // Log password change
    logAuditEvent(req, {
      action_type: 'PASSWORD_CHANGE',
      description: `User ${currentUser?.email ?? `ID:${userId}`} changed their password`,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully, please login again',
    });
  },
);
