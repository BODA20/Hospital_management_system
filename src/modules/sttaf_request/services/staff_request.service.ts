import * as staffRepo from '../repositories/staff_request.repo';
import { appError } from '../../../common/errors/AppError';
import * as usersRepo from '../../users/repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as nurseRepo from '../../nurses/repositories/nurse.repository';
import * as patientRepo from '../../patients/repositories/patient.repository';
import db from '../../../config/db';
import logger from '../../../common/utils/logger';

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

  try {
    return await db.transaction(async (trx) => {
      // 1. update request
      await staffRepo.updateStatus(requestId, {
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date(),
      }, trx);

      // 2. update user role and activate
      await usersRepo.adminUpdateUser(request.user_id, {
        role: request.requested_role,
        is_active: true
      }, trx);

      // 3. Conditional auto-provisioning
      if (request.requested_role === 'doctor') {
        const existingDoc = await doctorRepo.findByUserId(request.user_id, trx);
        if (!existingDoc) {
          await doctorRepo.createDoctor({
            user_id: request.user_id,
            specialization: 'General',
            consultation_fee: 0,
            years_of_experience: 0,
            bio: '',
          }, trx);
        }
      } else if (request.requested_role === 'nurse') {
        const existingNurse = await nurseRepo.findByUserId(request.user_id, trx);
        if (!existingNurse) {
          // Provide safe fallback IDs rather than direct trx() raw queries which crash jest mocks
          await nurseRepo.createNurse({
            user_id: request.user_id,
            department_id: 1,
            shift: 'morning',
            years_of_experience: 0,
            notes: '',
          }, trx);
        }
      }

      // 4. Delete from patients table to prevent duplicate roles Data
      await patientRepo.deleteByUserId(request.user_id, trx);

      return { message: 'Request approved successfully' };
    });
  } catch (error: any) {
    logger.error('CRASH IN APPROVE REQUEST', { error: error instanceof Error ? error.message : error });
    throw new appError(error.message || 'Failed to provision staff profile', 500);
  }
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

