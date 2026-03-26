import * as staffRepo from '../repositories/staff_request.repo';
import { appError } from '../../../common/errors/AppError';
import * as usersRepo from '../../users/repositories/user.repo';

export const getStaffRequest = async (userId: number) => {
  const request = await staffRepo.getAllPending();
  if (!request) {
    throw new appError('No request found', 404);
  }
  return request;
};

export const createStaffRequest = async (userId: number, role: string) => {
  const existing = await staffRepo.findByUserId(userId);

  if (existing) {
    throw new appError('You already submitted a request', 400);
  }

  const request = await staffRepo.createRequest({
    user_id: userId,
    requested_role: role,
  });

  return request;
};

export const approveRequest = async (requestId: number, adminId: number) => {
  const request = await staffRepo.findById(requestId);

  if (!request) {
    throw new appError('Request not found', 404);
  }

  if (request.status !== 'pending') {
    throw new appError('Request already processed', 400);
  }

  // 1. update request
  await staffRepo.updateStatus(requestId, {
    status: 'approved',
    approved_by: adminId,
    approved_at: new Date(),
  });

  // 2. update user role
  await usersRepo.updateUserRole(request.user_id, request.requested_role);

  return { message: 'Request approved successfully' };
};

export const rejectRequest = async (
  requestId: number,
  adminId: number,
  reason: string,
) => {
  const request = await staffRepo.findById(requestId);

  if (!request) {
    throw new appError('Request not found', 404);
  }

  if (request.status !== 'pending') {
    throw new appError('Request already processed', 400);
  }

  await staffRepo.updateStatus(requestId, {
    status: 'rejected',
    approved_by: adminId,
    rejection_reason: reason,
  });

  return { message: 'Request rejected' };
};
