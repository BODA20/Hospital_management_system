import * as staffService from '../services/staff_request.service';
import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { UserRole } from '../../users/user.types';

export const getStaffRequests = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await staffService.getStaffRequest(req.user!.id);
    res.status(200).json({
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
  const result = await staffService.approveRequest(
    Number(req.params.id),
    req.user!.id,
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const result = await staffService.rejectRequest(
    Number(req.params.id),
    req.user!.id,
    req.body.reason,
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});
