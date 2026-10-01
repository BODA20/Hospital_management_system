import express from 'express';
import { protect, restrictTo } from '../../common/middleware/auth';
import * as controller from './reception.controller';

export const receptionRouter = express.Router();

// All reception routes require authentication
receptionRouter.use(protect);

// ─── Receptionist + Admin ─────────────────────────────────────────────────────

// GET  /api/v1/reception/patients                 — patient search / list (tolerant query)
receptionRouter.get(
  '/patients',
  restrictTo('receptionist', 'admin'),
  controller.searchPatients,
);

// GET  /api/v1/reception/patients/search?query=  — fuzzy patient search (typeahead)
receptionRouter.get(
  '/patients/search',
  restrictTo('receptionist', 'admin'),
  controller.searchPatients,
);

// GET  /api/v1/reception/doctors                 — list active doctors for slot picker
receptionRouter.get(
  '/doctors',
  restrictTo('receptionist', 'admin'),
  controller.getDoctors,
);

// GET  /api/v1/reception/doctors/:id/booked-slots?date=YYYY-MM-DD  — taken slots for day
receptionRouter.get(
  '/doctors/:id/booked-slots',
  restrictTo('receptionist', 'admin'),
  controller.getBookedSlots,
);

// GET  /api/v1/reception/queue/today             — live queue board (ALL booking sources)
receptionRouter.get(
  '/queue/today',
  restrictTo('receptionist', 'admin', 'nurse'),
  controller.getTodayQueue,
);

// POST /api/v1/reception/patients                — quick patient registration (no OTP)
receptionRouter.post(
  '/patients',
  restrictTo('receptionist', 'admin'),
  controller.registerPatient,
);

// POST /api/v1/reception/book-walk-in            — walk-in booking with auto queue number
receptionRouter.post(
  '/book-walk-in',
  restrictTo('receptionist', 'admin'),
  controller.bookWalkIn,
);

// PATCH /api/v1/reception/queue/:id/payment      — mark appointment paid (cash or online)
receptionRouter.patch(
  '/queue/:id/payment',
  restrictTo('receptionist', 'admin'),
  controller.markPaid,
);

// PATCH /api/v1/reception/queue/:id/check-in     — check-in patient (arrived at desk)
receptionRouter.patch(
  '/queue/:id/check-in',
  restrictTo('receptionist', 'admin'),
  controller.checkIn,
);
