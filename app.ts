import 'dotenv/config';
import express from 'express';
import { errorHandler } from './src/common/middleware/errorHandler';
import usersRoutes from './src/modules/users/routes';
import adminsRouter from './src/modules/users/admins.routes';
import shiftsRouter from './src/modules/users/shifts.routes';
import authRoutes from './src/modules/auth/auth.routes';
import { staffRequestRouter } from './src/modules/sttaf_request/staff_request.routes';
import { staffApplicationRouter } from './src/modules/staff_application/staff_application.routes';
import { doctorsRouter } from './src/modules/doctors/doctors.routes';
import { appointmentsRouter } from './src/modules/appointments/appo.routes';
import { departmentsRouter } from './src/modules/department/department.routes';
import { nursesRouter } from './src/modules/nurses/nurses.routes';
import { patientsRouter } from './src/modules/patients/patients.routes';
import { visitsRouter } from './src/modules/visits/visits.routes';
import { dashboardRouter } from './src/modules/dashboard/dashboard.routes';
import { billingRouter } from './src/modules/billing/billing.routes';
import { stripeWebhookRouter } from './src/modules/billing/stripe.webhook.routes';
import auditRouter from './src/modules/audit/audit.routes';
import metricsRouter from './src/modules/metrics/metrics.routes';
import { receptionRouter } from './src/modules/reception/reception.routes';
import { notificationsRouter } from './src/modules/notifications/notifications.routes';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

export const app = express();

const defaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];
const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];
const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json({ limit: '10kb' }));
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { status: 'fail', message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use('/api', globalLimiter);

app.use('/api/v1/billing/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/staff-requests', staffRequestRouter);
app.use('/api/v1/staff-applications', staffApplicationRouter);
app.use('/api/v1/doctors', doctorsRouter);
app.use('/api/v1/appointments', appointmentsRouter);
app.use('/api/v1/departments', departmentsRouter);
app.use('/api/v1/nurses', nursesRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/visits', visitsRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/billing/invoices', billingRouter);
app.use('/api/v1/admins', adminsRouter);
app.use('/api/v1/admin', adminsRouter);
app.use('/api/v1/shifts', shiftsRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/metrics', metricsRouter);
app.use('/api/v1/reception', receptionRouter);
app.use('/api/v1/notifications', notificationsRouter);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

app.use(errorHandler);
