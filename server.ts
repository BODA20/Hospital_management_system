import 'dotenv/config';

// ─── Startup Env Validation ────────────────────────────────────────────────────
const requiredEnv = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error('[FATAL] Missing required environment variable:', key);
    process.exit(1);
  }
}

import { app } from './app';
import db from './src/config/db';

const PORT = process.env.PORT || 5000;

// ─── DB Connection Check ───────────────────────────────────────────────────────
db.raw('SELECT 1')
  .then(() => console.log('Database connected successfully'))
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// ─── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('Hospital Management System running on port ' + PORT);
  console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
  console.log('DB: ' + process.env.DB_HOST + ':' + process.env.DB_PORT + '/' + process.env.DB_NAME);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(signal + ' received. Starting graceful shutdown...');
  server.close(() => {
    console.log('HTTP server closed.');
    db.destroy()
      .then(() => { console.log('Database pool destroyed.'); process.exit(0); })
      .catch((err) => { console.error('Error destroying pool:', err); process.exit(1); });
  });
  setTimeout(() => { console.error('Forcefully shutting down'); process.exit(1); }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
