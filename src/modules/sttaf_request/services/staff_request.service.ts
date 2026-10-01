import * as staffRepo from '../repositories/staff_request.repo';
import { appError } from '../../../common/errors/AppError';
import * as usersRepo from '../../users/repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as nurseRepo from '../../nurses/repositories/nurse.repository';
import * as patientRepo from '../../patients/repositories/patient.repository';
import db from '../../../config/db';
import logger from '../../../common/utils/logger';

export const getStaffRequest = async (userId: number) => {
  try {
    const request = await staffRepo.getAllPending();
    if (!request) {
      throw new appError('No request found', 404);
    }
    return request;
  } catch (error: any) {
    logger.error('CRASH IN GET STAFF REQUESTS:', { error: error instanceof Error ? error.message : error });
    throw new appError(error.message || 'Failed to fetch staff requests', 500);
  }
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

      // 2. Check if operational request
      if (request.request_type) {
        if (request.request_type === 'Leave Request') {
          // Leave request side-effect: set is_on_leave = true
          await (trx('users') as any).where({ id: request.user_id }).update({ is_on_leave: true });
        } else if (request.request_type === 'Shift Change') {
          // Shift change side-effect: parse shift and update assigned_shift
          let targetShift: 'Morning' | 'Night' = 'Morning';
          const descLower = request.description ? request.description.toLowerCase() : '';
          if (descLower.includes('night')) {
            targetShift = 'Night';
          } else if (descLower.includes('morning')) {
            targetShift = 'Morning';
          }

          await (trx('users') as any).where({ id: request.user_id }).update({ assigned_shift: targetShift });

          const user = await trx('users').where({ id: request.user_id }).first();
          if (user && user.role === 'nurse') {
            await trx('nurses').where({ user_id: request.user_id }).update({ shift: targetShift.toLowerCase() });
          }
        }
      } else {
        // Original role promotion / signup request
        const rawRole = (request.requested_role || 'doctor').toString().toLowerCase();
        const targetRole: 'doctor' | 'nurse' = rawRole === 'nurse' ? 'nurse' : 'doctor';

        // update user role and activate
        await usersRepo.adminUpdateUser(request.user_id, {
          role: targetRole,
          is_active: true
        }, trx);

        // 3. Conditional auto-provisioning
        if (targetRole === 'doctor') {
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
        } else if (targetRole === 'nurse') {
          const existingNurse = await nurseRepo.findByUserId(request.user_id, trx);
          const userObj = await trx('users').where({ id: request.user_id }).first();
          const rawShift = (userObj as any)?.assigned_shift || request.description || 'Morning';
          const nurseShift: 'morning' | 'evening' | 'night' = String(rawShift).toLowerCase().includes('night')
            ? 'night'
            : String(rawShift).toLowerCase().includes('evening')
            ? 'evening'
            : 'morning';

          if (!existingNurse) {
            await nurseRepo.createNurse({
              user_id: request.user_id,
              department_id: null,
              shift: nurseShift,
              years_of_experience: 0,
              notes: '',
            }, trx);
          } else {
            await trx('nurses').where({ user_id: request.user_id }).update({ shift: nurseShift });
          }
        }

        // 4. Keep historic patient record intact so DB foreign keys (e.g. appointments) remain valid
      }

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

export const getOperationalRequests = async (userId: number) => {
  try {
    return await staffRepo.getOperationalRequestsByUserId(userId);
  } catch (error: any) {
    logger.error('CRASH IN GET OPERATIONAL REQUESTS:', { error: error instanceof Error ? error.message : error });
    throw new appError(error.message || 'Failed to fetch operational requests', 500);
  }
};

export const createOperationalRequest = async (
  userId: number,
  requestType: string,
  description: string
) => {
  if (!description || !description.trim()) {
    throw new appError('Description is required', 400);
  }
  const validTypes = ['Leave Request', 'Shift Change', 'Operational Support'];
  if (!validTypes.includes(requestType)) {
    throw new appError('Invalid request type', 400);
  }
  return await staffRepo.createOperationalRequest({
    user_id: userId,
    request_type: requestType,
    description: description.trim(),
  });
};

