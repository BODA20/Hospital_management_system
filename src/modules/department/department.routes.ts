import express from 'express';
import { getDepartments, createDepartment, deleteDepartment, getDoctorsByDepartment } from './controllers/department.controller';
import { protect, restrictTo } from '../../common/middleware/auth';

export const departmentsRouter = express.Router();

departmentsRouter.use(protect);
departmentsRouter.get('/', getDepartments);
departmentsRouter.get('/:departmentId/doctors', getDoctorsByDepartment);
departmentsRouter.post('/', restrictTo('admin'), createDepartment);
departmentsRouter.delete('/:id', restrictTo('admin'), deleteDepartment);

