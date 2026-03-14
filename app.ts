import express from 'express';
import { errorHandler } from './src/common/middleware/errorHandler';
import usersRoutes from './src/modules/users/routes';
import authRoutes from './src/modules/auth/auth.routes';
import dotenv from 'dotenv';

dotenv.config();
export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);

app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

app.use(errorHandler);
