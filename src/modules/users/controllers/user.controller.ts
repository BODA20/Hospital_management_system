import type { Request, Response } from 'express';
import * as userService from '../services/user.service';
import type { AdminUpdateUserDTO } from '../users.validation';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error("[Governance Backend Sync Error]:", error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await userService.getUserById(id);

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const user = await userService.getUserById(userId);

  res.status(200).json({
    status: 'success',
    data: user ? {
      ...user,
      full_name: user.full_name
    } : null,
  });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const updateData = req.body;

  const updatedUser = await userService.updateProfile(userId, updateData);

  // Audit: user updated their own profile data
  const selfUser = req.user as any;
  logAuditEvent(req, {
    action_type: 'USER_PROFILE_UPDATED',
    user_id:     selfUser?.id ?? null,
    actor_name:  selfUser?.full_name ?? selfUser?.email ?? `User ${userId}`,
    description: `User updated their own profile (fields: ${Object.keys(updateData).join(', ')})`,
  });

  res.status(200).json({
    status: 'success',
    data: updatedUser,
  });
});

export const deactivateUser = asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const user = await userService.deactivateUser(id);

  // Audit: explicit deactivation endpoint (distinct from adminUpdateUser ban path)
  const adminUser = req.user as any;
  logAuditEvent(req, {
    action_type: 'USER_DEACTIVATED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
    description: `Admin deactivated user account ID: ${id} (${user?.email ?? 'unknown email'})`,
  });

  res.status(200).json({
    status: 'success',
    message: 'User deactivated successfully',
    data: user,
  });
});

export const adminUpdateUser = asyncHandler(async (req: Request, res: Response) => {
  const targetId = Number(req.params.id);
  const updateData = req.body as AdminUpdateUserDTO;

  // Resolve admin identity with full defensive fallback chain.
  // actor_name must NEVER be null -- DB enforces a NOT NULL constraint.
  const adminUser = req.user as any;
  const adminEmail = adminUser?.email ?? adminUser?.full_name ?? 'Admin';

  // Fetch existing user snapshot BEFORE the update for diff logging
  const beforeUser = await userService.getUserById(targetId).catch(() => null);

  // Persist the update -- audit fires AFTER this commits so state is guaranteed.
  const user = await userService.adminUpdateUser(targetId, updateData);

  // Audit: Ban / Unban
  if (updateData.is_active === false && beforeUser?.is_active !== false) {
    logAuditEvent(req, {
      action_type: 'USER_BANNED',
      user_id:     adminUser?.id ?? null,
      actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
      description: `Admin (${adminEmail}) banned account: ${user.email} (Target User ID: ${targetId})`,
    });
  } else if (updateData.is_active === true && beforeUser?.is_active === false) {
    logAuditEvent(req, {
      action_type: 'USER_UNBANNED',
      user_id:     adminUser?.id ?? null,
      actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
      description: `Admin (${adminEmail}) unbanned account: ${user.email} (Target User ID: ${targetId})`,
    });
  }

  // Audit: Role Change -- records who performed the update and the target recipient.
  if (updateData.role && beforeUser && updateData.role !== beforeUser.role) {
    logAuditEvent(req, {
      action_type: 'ROLE_CHANGED',
      user_id:     adminUser?.id ?? null,
      actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
      description: `Admin modified operational permissions for Target User ID: ${targetId} -- role changed from '${beforeUser.role}' to '${updateData.role}'`,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: user,
  });
});
