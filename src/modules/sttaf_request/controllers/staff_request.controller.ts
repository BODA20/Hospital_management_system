import * as staffService from '../services/staff_request.service';
import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { UserRole } from '../../users/user.types';
import { logAuditEvent } from '../../audit/services/audit.service';
import db from '../../../config/db';

export const getStaffRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const role = req.user!.role;
    let result;
    if (role === 'admin') {
      result = await staffService.getStaffRequest(req.user!.id);
    } else {
      result = await staffService.getOperationalRequests(req.user!.id);
    }
    res.status(200).json({
      status: 'success',
      data: result,
    });
  },
);

export const createOperationalRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const { request_type, description } = req.body;
    const result = await staffService.createOperationalRequest(
      req.user!.id,
      request_type,
      description
    );

    if (request_type === 'Leave Request') {
      logAuditEvent(req, {
        action_type: 'LEAVE_REQUEST_SUBMITTED',
        user_id: req.user!.id,
        actor_name: (req.user as any).full_name || (req.user as any).email || 'Authorized Staff Operator',
        description: `Staff submitted a new leave request ID: ${result.id}`,
      });
    }

    res.status(201).json({
      status: 'success',
      data: result,
    });
  },
);

export const createRequest = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid ID: The ID must be a valid number.',
      });
    }

    const { role } = req.body;
    const result = await staffService.createStaffRequest(id, role as UserRole);

    res.status(201).json({
      status: 'success',
      data: result,
    });
  },
);

export const approve = asyncHandler(async (req: Request, res: Response) => {
  const requestId = Number(req.params.id);
  const adminUser = req.user as any;

  const request = await db('staff_requests').where({ id: requestId }).first();

  const result = await staffService.approveRequest(
    requestId,
    adminUser.id,
  );

  const isLeaveRequest = request && request.request_type === 'Leave Request';
  const description = isLeaveRequest
    ? "Admin approved staff LEAVE REQUEST for Request ID: " + req.params.id
    : `Admin approved staff request ID ${requestId}`;

  // Audit: REQUEST_APPROVED
  // Fires AFTER approveRequest() commits to DB. Defensive fallback chain ensures
  // actor_name is never null -- satisfies the DB NOT NULL constraint at all times.
  logAuditEvent(req, {
    action_type: 'REQUEST_APPROVED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name
                   ?? adminUser?.email
                   ?? 'Authorized Admin Operator',
    description,
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const requestId = Number(req.params.id);
  const adminUser = req.user as any;

  const result = await staffService.rejectRequest(
    requestId,
    adminUser.id,
    req.body.reason,
  );

  // Audit: REQUEST_REJECTED
  // Fires AFTER rejectRequest() commits to DB. Defensive fallback chain ensures
  // actor_name is never null -- satisfies the DB NOT NULL constraint at all times.
  logAuditEvent(req, {
    action_type: 'REQUEST_REJECTED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name
                   ?? adminUser?.email
                   ?? 'Authorized Admin Operator',
    description: `Admin rejected staff request ID ${requestId}. Reason: ${req.body.reason ?? 'N/A'}`,
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});
