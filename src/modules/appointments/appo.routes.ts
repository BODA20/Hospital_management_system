import express from 'express';
import * as controller from './controllers/appo.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createAppointmentSchema,
  updateStatusSchema,
  rescheduleAppointmentSchema,
} from './appo.schema';

export const appointmentsRouter = express.Router();

// ─── Public Unprotected Email Action Routes ─────────────────────────────────
appointmentsRouter.post('/public-action', controller.publicAppointmentAction);
appointmentsRouter.post('/confirm', controller.confirmByToken);
appointmentsRouter.post('/cancel', controller.cancelByToken);


// All subsequent appointment routes require authentication
appointmentsRouter.use(protect);

// ─── Patient & Staff Booking Route ──────────────────────────────────────────────
appointmentsRouter.post(
  '/',
  restrictTo('patient', 'admin', 'doctor'),
  validate(createAppointmentSchema),
  controller.createAppointment,
);

// ─── Patient Routes ────────────────────────────────────────────────────────────
appointmentsRouter.get(
  '/me',
  restrictTo('patient'),
  controller.getMyAppointments,
);

// ─── Doctor Routes ─────────────────────────────────────────────────────────────
appointmentsRouter.get(
  '/doctor/schedule/today',
  restrictTo('doctor'),
  controller.getDailySchedule,
);

appointmentsRouter.get(
  '/doctor',
  restrictTo('doctor'),
  controller.getDoctorAppointments,
);

// ─── Admin Master Routes ───────────────────────────────────────────────────────
appointmentsRouter.get(
  '/',
  restrictTo('admin', 'nurse'),
  controller.getAllAppointments,
);

// ─── REQ 3: Interactive Attendance Confirmation (email action buttons) ─────────
// These are hit when patient clicks email CTA buttons – no auth required (token in URL is the ID)
appointmentsRouter.get('/:id/confirm-attendance', controller.confirmAttendance);
appointmentsRouter.get('/:id/cancel-by-patient',  controller.cancelByPatient);
appointmentsRouter.post('/:id/confirm-attendance', controller.confirmAttendance);
appointmentsRouter.post('/:id/cancel-by-patient',  controller.cancelByPatient);

// ─── Shared Update & Reschedule Routes ─────────────────────────────────────────
appointmentsRouter.patch(
  '/:id/complete',
  restrictTo('patient', 'doctor', 'admin', 'nurse'),
  controller.completeAppointment,
);

appointmentsRouter.patch(
  '/:id/status',
  restrictTo('patient', 'doctor', 'admin', 'nurse'),
  validate(updateStatusSchema),
  controller.updateStatus,
);

appointmentsRouter.patch(
  '/:id/reschedule',
  restrictTo('admin', 'doctor'),
  validate(rescheduleAppointmentSchema),
  controller.rescheduleAppointment,
);
