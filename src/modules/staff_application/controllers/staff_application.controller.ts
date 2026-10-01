import * as staffAppService from '../services/staff_application.service';
import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { requested_role, specialization_notes, requested_shift } = req.body;

  const result = await staffAppService.createApplication(userId, requested_role, requested_shift, specialization_notes);

  // Audit: staff member submitted a join-staff application
  const applicant = req.user as any;
  logAuditEvent(req, {
    action_type: 'STAFF_APPLICATION_SUBMITTED',
    user_id:     applicant?.id ?? null,
    actor_name:  applicant?.full_name ?? applicant?.email ?? 'Authenticated User',
    description: `User submitted a staff application for role: ${requested_role} (shift: ${requested_shift})`,
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});

export const getMyApplications = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await staffAppService.getMyApplications(userId);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const getAllApplications = asyncHandler(async (req: Request, res: Response) => {
  const result = await staffAppService.getAllApplications();

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const processApplication = asyncHandler(async (req: Request, res: Response) => {
  const applicationId = Number(req.params.id);
  const { status, rejection_reason } = req.body;

  const result = await staffAppService.processApplication(applicationId, status, rejection_reason);

  // ── Audit: explicitly AWAIT so DB failures surface in the error log ───────
  // Previous implementation was fire-and-forget which caused Postgres CHECK
  // constraint violations (missing action types) to be silently swallowed.
  // req.user is always populated here — this route is behind protect + restrictTo('admin').
  const adminUser = req.user as any;
  const actorName = adminUser?.full_name ?? adminUser?.email ?? 'Authorized Admin Operator';

  if (status === 'approved') {
    await logAuditEvent(req, {
      action_type: 'STAFF_REQUEST_APPROVED',
      user_id:     adminUser?.id ?? null,
      actor_name:  actorName,
      description: `Admin approved staff application #${result.applicationId} for User ID: ${result.user_id} as ${result.requested_role} on ${result.requested_shift} shift.`,
    });
  } else if (status === 'rejected') {
    await logAuditEvent(req, {
      action_type: 'STAFF_REQUEST_REJECTED',
      user_id:     adminUser?.id ?? null,
      actor_name:  actorName,
      description: `Admin rejected staff application #${result.applicationId} for User ID: ${result.user_id}. Reason: ${rejection_reason ?? 'N/A'}`,
    });
  }

  res.status(200).json({
    status: 'success',
    data: result,
  });
});
