import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import type { StatsQuery } from '../dashboard.validation';

// GET /api/v1/dashboard/admin-summary — admin only (existing)
export const getAdminSummary = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await dashboardService.getAdminSummary();

    res.status(200).json({
      status: 'success',
      data,
    });
  },
);

// GET /api/v1/dashboard/stats — admin only (new comparative analytics)
export const getStats = asyncHandler(
  async (req: Request, res: Response) => {
    // req.validatedQuery is set by the validateQuery middleware (Express 5 makes req.query read-only)
    const query = req.validatedQuery as StatsQuery;
    const data = await dashboardService.getStats(query);

    res.status(200).json({
      status: 'success',
      data,
    });
  },
);
