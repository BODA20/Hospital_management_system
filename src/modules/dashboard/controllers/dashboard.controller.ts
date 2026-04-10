import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

// GET /api/v1/dashboard/admin-summary — admin only
export const getAdminSummary = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await dashboardService.getAdminSummary();

    res.status(200).json({
      status: 'success',
      data,
    });
  },
);
