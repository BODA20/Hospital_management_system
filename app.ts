import express from 'express';
import { errorHandler } from './src/common/middleware/errorHandler';
import usersRoutes from './src/modules/users/routes';
import authRoutes from './src/modules/auth/auth.routes';
import dotenv from 'dotenv';
import { staffRequestRouter } from './src/modules/sttaf_request/staff_request.routes';
import { doctorsRouter } from './src/modules/doctors/doctors.routes';
import { appointmentsRouter } from './src/modules/appointments/appo.routes';
import { departmentsRouter } from './src/modules/department/department.routes';
import { nursesRouter } from './src/modules/nurses/nurses.routes';
import { patientsRouter } from './src/modules/patients/patients.routes';
import { visitsRouter } from './src/modules/visits/visits.routes';
import { dashboardRouter } from './src/modules/dashboard/dashboard.routes';

dotenv.config();
export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/staff-requests', staffRequestRouter);
app.use('/api/v1/doctors', doctorsRouter);
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/departments', departmentsRouter);
app.use('/api/v1/nurses', nursesRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/visits', visitsRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

app.use(errorHandler);
