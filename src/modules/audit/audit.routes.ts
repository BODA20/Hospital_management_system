import { Router } from 'express';
import { protect, restrictTo } from '../../common/middleware/auth';
import * as auditController from './controllers/audit.controller';

const router = Router();

// All audit routes require authentication and admin role
router.use(protect, restrictTo('admin'));

/**
 * GET /api/v1/audit/security-logs
 * Returns security logs — supports ?action_type=, ?search=, ?limit=
 */
router.get('/security-logs', auditController.getSecurityLogs);

export default router;
