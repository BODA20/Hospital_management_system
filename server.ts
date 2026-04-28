import 'dotenv/config';

// ─── Startup Env Validation ────────────────────────────────────────────────────
// Must run BEFORE any module import that reads process.env (e.g. config/db.ts).
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

const PORT = process.env.PORT || 3000;

// ─── DB Connection Check ───────────────────────────────────────────────────────
db.raw('SELECT 1')
  .then(() => console.log('✅ Database connected successfully'))
  .catch((err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

// ─── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('\🚀 Server started on port \\');
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log('\n\ received. Starting graceful shutdown...');

  server.close(() => {
    console.log('HTTP server closed.');

    db.destroy()
      .then(() => {
        console.log('Database connection pool destroyed.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Error destroying database pool:', err);
        process.exit(1);
      });
  });

  // Force exit after 10s if shutdown hangs
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
