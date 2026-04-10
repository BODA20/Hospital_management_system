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

// ─── Doctor route — view own nursing team ──────────────────────────────────────
nursesRouter.get(
  '/my-team',
  restrictTo('doctor'),
  nurseController.getNursesByDoctor,
);

// ─── Shared authenticated routes ───────────────────────────────────────────────
nursesRouter.get('/', nurseController.getAllNurses);
nursesRouter.get('/:id', nurseController.getNurseById);
