import express from 'express';
import * as staffAppController from './controllers/staff_application.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createStaffApplicationBodySchema,
  updateStaffApplicationBodySchema,
  applicationIdParamSchema,
} from './staff_application.validation';

export const staffApplicationRouter = express.Router();

staffApplicationRouter.use(protect);

// Patient routes
staffApplicationRouter.post(
  '/',
  validate(createStaffApplicationBodySchema, 'body'),
  staffAppController.createApplication
);

staffApplicationRouter.get(
  '/me',
  staffAppController.getMyApplications
);

// Admin only routes
staffApplicationRouter.use(restrictTo('admin'));

staffApplicationRouter.get(
  '/',
  staffAppController.getAllApplications
);

// PATCH is the canonical method for partial updates (used by the React frontend).
// PUT alias is kept for backwards-compatibility with any older client code.
staffApplicationRouter.patch(
  '/:id',
  validate(applicationIdParamSchema, 'params'),
  validate(updateStaffApplicationBodySchema, 'body'),
  staffAppController.processApplication
);

staffApplicationRouter.put(
  '/:id',
  validate(applicationIdParamSchema, 'params'),
  validate(updateStaffApplicationBodySchema, 'body'),
  staffAppController.processApplication
);
