import express from 'express';
import * as doctorsController from '../doctors/controllers/doctor.controller';
import { protect, restrictTo } from '../../common/middleware/auth';
import { validate } from '../../common/middleware/validate';
import { updateDoctorSchema } from './doctor.schema';

export const doctorsRouter = express.Router();

doctorsRouter.get('/', doctorsController.getAllDoctors);

doctorsRouter.use(protect);

doctorsRouter.get('/me', restrictTo('doctor'), doctorsController.getMyProfile);

doctorsRouter.patch(
  '/me',
  restrictTo('doctor'),
  validate(updateDoctorSchema),
  doctorsController.updateMyProfile,
);
