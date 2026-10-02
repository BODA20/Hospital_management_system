import express from 'express';
import * as nurseController from '../nurses/controllers/nurse.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { createNurseSchema, updateNurseSchema } from '../nurses/nurse.schema';

export const nursesRouter = express.Router();

nursesRouter.use(protect);

// ─── Admin routes ──────────────────────────────────────────────────────────────
nursesRouter.post(
  '/',
  restrictTo('admin'),
  validate(createNurseSchema),
  nurseController.createNurse,
);

nursesRouter.patch(
  '/:id',
  restrictTo('admin'),
  validate(updateNurseSchema),
  nurseController.updateNurse,
);

nursesRouter.delete('/:id', restrictTo('admin'), nurseController.deleteNurse);


// ─── Shared authenticated routes ───────────────────────────────────────────────
nursesRouter.get('/vitals-queue', restrictTo('nurse', 'admin', 'doctor', 'receptionist'), nurseController.getVitalsQueue);
nursesRouter.get('/me/beds', restrictTo('nurse', 'admin'), nurseController.getMyBeds);
nursesRouter.get('/me/tasks', restrictTo('nurse', 'admin'), nurseController.getMyTasks);
nursesRouter.get('/', restrictTo('admin', 'nurse', 'doctor', 'receptionist'), nurseController.getAllNurses);
nursesRouter.get('/:id', restrictTo('admin', 'nurse', 'doctor', 'receptionist'), nurseController.getNurseById);
