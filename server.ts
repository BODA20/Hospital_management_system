import 'dotenv/config';
import logger from './src/common/utils/logger';

const requiredEnv = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_URL',
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    logger.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import { app } from './app';
import db from './src/config/db';
import { connectRedis, disconnectRedis } from './src/config/redis';

const PORT = process.env.PORT || 5000;

// ─── Startup: DB + Redis ───────────────────────────────────────────────────────
Promise.all([
  db.raw('SELECT 1'),
  connectRedis(),
])
  .then(() => {
    logger.info('Database and Redis connected successfully');
  })
  .catch((err: Error) => {
    logger.error('Startup connection failed', { error: err.message });
    process.exit(1);
  });

const server = app.listen(PORT, () => {
  logger.info('Hospital Management System started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    database: `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`,
    redis: process.env.REDIS_URL,
  });
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.warn(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await disconnectRedis();
      await db.destroy();
      logger.info('Redis and database connections closed.');
      process.exit(0);
    } catch (err: any) {
      logger.error('Error during shutdown cleanup', { error: err.message });
      process.exit(1);
    }
  });

  // Force-exit after 10 s if graceful close stalls
  setTimeout(() => {
    logger.error('Forcefully shutting down due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));