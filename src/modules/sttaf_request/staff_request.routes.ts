import express from 'express';
import * as staffController from './controllers/staff_request.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate'; // تأكد من المسار
import {
  createStaffRequestBodySchema,
  approveRejectParamsSchema,
  approveRejectBodySchema,
  staffIdParamSchema,
} from './staff_request.validation';

export const staffRequestRouter = express.Router({ mergeParams: true });

staffRequestRouter.use(protect);

staffRequestRouter.post(
  '/:id',
  validate(staffIdParamSchema, 'params'),
  validate(createStaffRequestBodySchema, 'body'),
  staffController.createRequest,
);

staffRequestRouter.use(restrictTo('admin'));

staffRequestRouter.get('/', staffController.getStaffRequests);

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
