import express from 'express';
import * as doctorsController from './controllers/doctor.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { updateDoctorSchema } from './doctor.schema';

export const doctorsRouter = express.Router();

// ── Public Routes ──────────────────────────────────────────────────────────────
doctorsRouter.get('/', doctorsController.getAllDoctors);

// ── Protected Named Routes (declared before /:id so they are not swallowed) ───
doctorsRouter.get('/me', protect, restrictTo('doctor'), doctorsController.getMyProfile);

doctorsRouter.patch(
  '/me',
  protect,
  restrictTo('doctor'),
  validate(updateDoctorSchema),
  doctorsController.updateMyProfile,
);

doctorsRouter.get(
  '/my-appointments',
  protect,
  restrictTo('doctor'),
  doctorsController.getMyAppointments,
);

doctorsRouter.patch(
  '/:id',
  protect,
  restrictTo('admin'),
  validate(updateDoctorSchema),
  doctorsController.adminUpdateDoctor,
);

// ── Public Wildcard (after named routes to avoid swallowing /me, /my-appointments) ──
doctorsRouter.get('/:id', doctorsController.getDoctorById);
