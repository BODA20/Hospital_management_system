import express from 'express';
import * as staffController from './controllers/staff_request.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createStaffRequestBodySchema,
  approveRejectParamsSchema,
  approveRejectBodySchema,
  staffIdParamSchema,
} from './staff_request.validation';

export const staffRequestRouter = express.Router({ mergeParams: true });

staffRequestRouter.use(protect);

// ── Staff Operational Requests (For logged-in staff/admin) ──
staffRequestRouter.post(
  '/',
  restrictTo('doctor', 'nurse', 'admin', 'receptionist'),
  staffController.createOperationalRequest
);

staffRequestRouter.post(
  '/create',
  restrictTo('doctor', 'nurse', 'admin', 'receptionist'),
  staffController.createOperationalRequest
);

staffRequestRouter.get(
  '/',
  restrictTo('admin', 'doctor', 'nurse'),
  staffController.getStaffRequests
);

// ── Original Signup/Role requests ──
staffRequestRouter.post(
  '/:id',
  validate(staffIdParamSchema, 'params'),
  validate(createStaffRequestBodySchema, 'body'),
  staffController.createRequest,
);

// Below routes are restricted to admin only (excluding GET / since we moved it above)
staffRequestRouter.use(restrictTo('admin'));


staffRequestRouter.patch(
  '/:id/approve',
  validate(approveRejectParamsSchema, 'params'),
  staffController.approve,
);

staffRequestRouter.patch(
  '/:id/reject',
  validate(approveRejectParamsSchema, 'params'),
  validate(approveRejectBodySchema, 'body'),
  staffController.reject,
);
