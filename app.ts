// src/app.ts
import express from 'express';
import { errorHandler } from './src/common/middleware/errorHandler';
import usersRoutes from './src/modules/users/routes';

export const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1/users', usersRoutes);

app.use((_req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

app.use(errorHandler);
