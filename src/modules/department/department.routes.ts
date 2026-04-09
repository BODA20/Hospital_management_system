import express from 'express';
import * as deptController from '../department/controllers/department.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from '../department/department.schema';

export const departmentsRouter = express.Router();

// All department routes require authentication
departmentsRouter.use(protect);

// ─── Public (any authenticated user) ──────────────────────────────────────────
departmentsRouter.get('/', deptController.getAllDepartments);
departmentsRouter.get('/:id', deptController.getDepartmentById);

// ─── Admin only ────────────────────────────────────────────────────────────────
departmentsRouter.post(
  '/',
  restrictTo('admin'),
  validate(createDepartmentSchema),
  deptController.createDepartment,
);

departmentsRouter.patch(
  '/:id',
  restrictTo('admin'),
  validate(updateDepartmentSchema),
  deptController.updateDepartment,
);

departmentsRouter.delete(
  '/:id',
  restrictTo('admin'),
  deptController.deleteDepartment,
);
