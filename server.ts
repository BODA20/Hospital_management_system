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
import { startAppointmentWorker } from './src/jobs/appointmentWorker';
import { autoExpireMissedAppointments } from './src/modules/appointments/services/appo.service';

const PORT = process.env.PORT || 5000;

// ─── Startup: DB + Redis + Auto-migrate ───────────────────────────────────────
Promise.all([
  db.raw('SELECT 1'),
  connectRedis(),
])
  .then(async () => {
    logger.info('Database and Redis connected successfully');

    // Run any pending migrations automatically on every startup.
    // This is idempotent — Knex skips migrations that have already run.
    // It guarantees schema changes (e.g. making nurses.department_id nullable)
    // take effect the moment the container restarts without a manual CLI step.
    try {
      // In development ts-node-dev compiles .ts migrations on the fly.
      // In production the compiled .js files live in dist/migrations/.
      const isProd = process.env.NODE_ENV === 'production';
      const [batch, migrations] = await db.migrate.latest({
        directory:                    isProd ? './dist/migrations' : './migrations',
        loadExtensions:               isProd ? ['.js'] : ['.ts'],
        // Prevents Knex from crashing when knex_migrations contains records
        // for files that no longer exist on disk (e.g. legacy .js entries).
        disableMigrationsListValidation: true,
      } as any);
      if (migrations.length === 0) {
        logger.info('Database schema up-to-date — no pending migrations');
      } else {
        logger.info(`Ran ${migrations.length} migration(s) in batch ${batch}`, {
          migrations: migrations.map((m: string) => m.split('/').pop()),
        });
      }

      // ── Startup backfill: mark all historical past-pending as 'missed' ───────
      const expiredCount = await autoExpireMissedAppointments();
      logger.info(`[Startup] Auto-expire sweep complete — ${expiredCount} appointment(s) marked 'missed'`);
      console.log(`[Startup] Auto-expire sweep complete — ${expiredCount} appointment(s) marked 'missed'`);

      // Initialize background appointment worker engine (runs every 60 seconds)
      startAppointmentWorker(60 * 1000);
    } catch (migrationErr: any) {
      logger.error('Migration failed on startup', { error: migrationErr.message });
      process.exit(1);
    }
  })
  .catch((err: Error) => {
    logger.error('Startup connection failed', { error: err.message });
    process.exit(1);
  });

const server = app.listen(Number(PORT), '0.0.0.0', () => {
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