import { Router } from 'express';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validateQuery } from '../../common/middleware/validateQuery';
import { statsQuerySchema } from './dashboard.validation';
import * as dashboardController from './controllers/dashboard.controller';

export const dashboardRouter = Router();

// All dashboard routes require authentication
dashboardRouter.use(protect);

// GET /api/v1/dashboard/admin-summary — admin & nurse
// Nurses need the operational overview to coordinate care.
dashboardRouter.get(
  '/admin-summary',
  restrictTo('admin', 'nurse'),
  dashboardController.getAdminSummary,
);

// GET /api/v1/dashboard/stats?period=week  OR  ?startDate=...&endDate=...
// Deep comparative analytics — admin only
dashboardRouter.get(
  '/stats',
  restrictTo('admin'),
  validateQuery(statsQuerySchema),
  dashboardController.getStats,
);

