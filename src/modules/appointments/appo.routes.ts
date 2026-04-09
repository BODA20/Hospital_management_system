import express from 'express';
import * as controller from '../appointments/controllers/appo.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createAppointmentSchema,
  updateStatusSchema,
} from '../appointments/appo.schema';

export const appointmentsRouter = express.Router();

// All appointment routes require authentication
appointmentsRouter.use(protect);

// ─── Patient Routes ────────────────────────────────────────────────────────────
appointmentsRouter.post(
  '/',
  restrictTo('patient'),
  validate(createAppointmentSchema),
  controller.createAppointment,
);

appointmentsRouter.get(
  '/me',
  restrictTo('patient'),
  controller.getMyAppointments,
);

// ─── Doctor Routes ─────────────────────────────────────────────────────────────

// GET /doctor/schedule/today — daily schedule with patient list & counts
appointmentsRouter.get(
  '/doctor/schedule/today',
  restrictTo('doctor'),
  controller.getDailySchedule,
);

// GET /doctor — all doctor appointments
appointmentsRouter.get(
  '/doctor',
  restrictTo('doctor'),
  controller.getDoctorAppointments,
);

// PATCH /:id/status — update appointment status (doctor only)
appointmentsRouter.patch(
  '/:id/status',
  restrictTo('doctor'),
  validate(updateStatusSchema),
  controller.updateStatus,
);
