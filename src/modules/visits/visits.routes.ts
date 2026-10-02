import express from 'express';
import * as visitController from '../visits/controllers/visit.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createVisitSchema,
  updateVisitSchema,
  recordVitalsSchema,
} from '../visits/visit.schema';

export const visitsRouter = express.Router();

visitsRouter.use(protect);

// ─── Doctor: pending dashboard & own visits ────────────────────────────────────
visitsRouter.get(
  '/pending',
  restrictTo('doctor'),
  visitController.getPendingVisits,
);

visitsRouter.get(
  '/my-visits',
  restrictTo('doctor'),
  visitController.getMyVisits,
);

visitsRouter.post(
  '/',
  restrictTo('doctor', 'admin'),
  validate(createVisitSchema),
  visitController.createVisit,
);

// ─── Nurse: patient check-in (creates a visit in awaiting_vitals state) ──────
visitsRouter.post(
  '/check-in',
  restrictTo('nurse', 'receptionist', 'admin'),
  visitController.nurseCheckIn,
);

// ─── Get visit by appointment ID (for doctor consultation modal & reception print) ──
visitsRouter.get(
  '/by-appointment/:appointmentId',
  restrictTo('admin', 'doctor', 'nurse', 'receptionist'),
  visitController.getByAppointmentId,
);

// ─── Nurse / Admin: record vitals ──────────────────────────────────────────────
visitsRouter.patch(
  '/:id/vitals',
  restrictTo('nurse', 'admin'),
  validate(recordVitalsSchema),
  visitController.recordVitals,
);

visitsRouter.post(
  '/:id/vitals',
  restrictTo('nurse', 'admin'),
  validate(recordVitalsSchema),
  visitController.recordVitals,
);

// ─── Patient history (by patient ID) — admin or doctor ────────────────────────
visitsRouter.get(
  '/patient/:patientId',
  restrictTo('admin', 'doctor'),
  visitController.getPatientHistory,
);

// ─── Patient: view own visit history ─────────────────────────────────────────
visitsRouter.get(
  '/my-records',
  restrictTo('patient'),
  visitController.getMyRecordsAsPatient,
);

// ─── Admin/Reception: view all visits ──────────────────────────────────────────
visitsRouter.get('/', restrictTo('admin', 'doctor', 'nurse', 'receptionist'), visitController.getAllVisits);

// ─── Single visit detail — shared ─────────────────────────────────────────────
visitsRouter.get('/:id', restrictTo('admin', 'doctor', 'nurse', 'receptionist'), visitController.getVisitById);

// ─── Update visit (doctor who created it or admin) ────────────────────────────
visitsRouter.patch(
  '/:id/complete',
  restrictTo('doctor', 'admin'),
  visitController.completeVisit,
);

visitsRouter.patch(
  '/:id',
  restrictTo('doctor', 'admin'),
  validate(updateVisitSchema),
  visitController.updateVisit,
);

// ─── Delete / cancel visit (admin only) ───────────────────────────────────────
visitsRouter.delete('/:id', restrictTo('admin'), visitController.deleteVisit);

