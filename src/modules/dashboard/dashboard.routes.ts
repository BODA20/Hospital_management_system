import { Router } from 'express';
import { protect, restrictTo } from '../../common/middleware/auth';
import * as dashboardController from './controllers/dashboard.controller';

export const dashboardRouter = Router();

// All dashboard routes are protected and admin-only
dashboardRouter.use(protect);
dashboardRouter.use(restrictTo('admin'));

// GET /api/v1/dashboard/admin-summary
dashboardRouter.get('/admin-summary', dashboardController.getAdminSummary);
