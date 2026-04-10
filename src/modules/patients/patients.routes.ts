import express from 'express';
import * as patientController from '../patients/controllers/patient.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
} from '../patients/patient.schema';

export const patientsRouter = express.Router();

// All patient routes require authentication
patientsRouter.use(protect);

// ─── Patient self-service routes ───────────────────────────────────────────────
patientsRouter.get(
  '/me',
  restrictTo('patient'),
  patientController.getMyProfile,
);

patientsRouter.get(
  '/me/appointments',
  restrictTo('patient'),
  patientController.getMyAppointments,
);

// ─── Admin / Doctor routes ─────────────────────────────────────────────────────
patientsRouter.get(
  '/',
  restrictTo('admin', 'doctor'),
  validate(patientQuerySchema, 'query'),
  patientController.getAllPatients,
);

patientsRouter.post(
  '/',
  restrictTo('admin'),
  validate(createPatientSchema),
  patientController.createPatient,
);

patientsRouter.get(
  '/:id',
  restrictTo('admin', 'doctor'),
  patientController.getPatientById,
);

// Task 2: Get all appointments for a specific patient
patientsRouter.get(
  '/:id/appointments',
  restrictTo('admin', 'doctor'),
  patientController.getPatientAppointments,
);

patientsRouter.patch(
  '/:id',
  restrictTo('admin'),
  validate(updatePatientSchema),
  patientController.updatePatient,
);

patientsRouter.delete(
  '/:id',
  restrictTo('admin'),
  patientController.deletePatient,
);
