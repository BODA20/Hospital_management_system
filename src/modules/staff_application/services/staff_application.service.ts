import * as staffAppRepo from '../repositories/staff_application.repo';
import { appError } from '../../../common/errors/AppError';
import * as usersRepo from '../../users/repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as nurseRepo from '../../nurses/repositories/nurse.repository';
import * as patientRepo from '../../patients/repositories/patient.repository';
import db from '../../../config/db';
import logger from '../../../common/utils/logger';

import { Email } from '../../../common/utils/email';

export const createApplication = async (userId: number, role: 'doctor' | 'nurse', requestedShift: 'Morning' | 'Night', specializationNotes?: string) => {
  const existing = await staffAppRepo.findByUserId(userId);
  if (existing) {
    throw new appError('You have already submitted a staff application.', 400);
  }

  return await staffAppRepo.createApplication({
    user_id: userId,
    requested_role: role,
    requested_shift: requestedShift,
    specialization_notes: specializationNotes,
  });
};

export const getMyApplications = async (userId: number) => {
  return await staffAppRepo.getByUserId(userId);
};

export const getAllApplications = async () => {
  return await staffAppRepo.getAll();
};

export const processApplication = async (applicationId: number, status: 'approved' | 'rejected', rejectionReason?: string) => {
  const application = await staffAppRepo.findById(applicationId);

  if (!application) {
    throw new appError('Application not found', 404);
  }

  if (application.status !== 'pending') {
    throw new appError('Application already processed', 400);
  }

  let processResult: any = null;

  try {
    processResult = await db.transaction(async (trx) => {
      // 1. Update application status
      await staffAppRepo.updateStatus(applicationId, {
        status,
        rejection_reason: rejectionReason,
      }, trx);

      if (status === 'approved') {
        // 2. DB ENUM & Role Sanitization:
        //    Ensure valid DB roles ('doctor' | 'nurse') matching exact table constraints
        const rawRole = (application.requested_role || 'doctor').toString().toLowerCase();
        const targetRole: 'doctor' | 'nurse' | 'receptionist' =
          rawRole === 'nurse' ? 'nurse' : rawRole === 'receptionist' ? 'receptionist' : 'doctor';

        //    Normalise shift enum for users ('Morning' | 'Night') and nurses ('morning' | 'night' | 'evening')
        const rawShift = String(application.requested_shift ?? 'Morning').toLowerCase();
        const nurseShift: 'morning' | 'evening' | 'night' =
          rawShift.includes('night') ? 'night' : rawShift.includes('evening') ? 'evening' : 'morning';
        const userShift: 'Morning' | 'Night' = nurseShift === 'night' ? 'Night' : 'Morning';

        // 3. Update user role, activate, and assign shift
        await usersRepo.adminUpdateUser(application.user_id, {
          role:           targetRole,
          is_active:      true,
          assigned_shift: userShift,
        }, trx);

        // 4. Conditional auto-provisioning of doctor or nurse profile
        if (targetRole === 'doctor') {
          const existingDoc = await doctorRepo.findByUserId(application.user_id, trx);
          if (!existingDoc) {
            await doctorRepo.createDoctor({
              user_id:             application.user_id,
              specialization:      application.specialization_notes || 'General',
              consultation_fee:    0,
              years_of_experience: 0,
              bio:                 application.specialization_notes || '',
            } as any, trx);
          }
        } else if (targetRole === 'nurse') {
          const existingNurse = await nurseRepo.findByUserId(application.user_id, trx);
          if (!existingNurse) {
            await nurseRepo.createNurse({
              user_id:             application.user_id,
              department_id:       null, // Safe default per DB nullable FK
              shift:               nurseShift,
              years_of_experience: 0,
              notes:               application.specialization_notes || '',
            }, trx);
          }
        }
        // 5. Keep historic patient record intact so DB foreign keys (e.g. appointments) remain valid
      }

      return {
        message:        `Application ${status} successfully`,
        applicationId,
        status,
        requested_role: application.requested_role,
        requested_shift: application.requested_shift,
        user_id:         application.user_id,
      };
    });
  } catch (error: any) {
    logger.error('CRASH IN PROCESS APPLICATION', { error: error instanceof Error ? error.message : error });
    throw new appError(error.message || 'Failed to process staff application', 500);
  }

  // ── 6. SAFE MAILER DISPATCH (Non-blocking try/catch guard) ─────────────────
  // If email notification fails, log error but DO NOT crash HTTP response
  try {
    const applicantUser: any = await db('users').where({ id: application.user_id }).first();
    if (applicantUser && applicantUser.email) {
      const mailer: any = new Email(
        { email: applicantUser.email, name: applicantUser.full_name || applicantUser.email },
        process.env.APP_URL || 'http://localhost:5173'
      );
      if (status === 'approved') {
        if (typeof mailer.sendStaffApproval === 'function') {
          await mailer.sendStaffApproval(application.requested_role, application.requested_shift);
        }
      } else {
        if (typeof mailer.sendStaffRejection === 'function') {
          await mailer.sendStaffRejection(rejectionReason);
        }
      }
      logger.info(`[StaffApplication] Approval email sent to ${applicantUser.email}`);
    }
  } catch (mailErr: any) {
    logger.error('[StaffApplication] Non-fatal email dispatch failure:', {
      message: mailErr?.message || mailErr,
      applicationId,
    });
  }

  return processResult;
};


