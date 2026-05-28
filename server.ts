import 'dotenv/config';
import logger from './src/common/utils/logger'; 

const requiredEnv = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    logger.error(`[FATAL] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import { app } from './app';
import db from './src/config/db';

const PORT = process.env.PORT || 5000;

// ─── DB Connection Check ───────────────────────────────────────────────────────
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connected successfully'); // تبديل الـ console.log
  })
  .catch((err) => {
    logger.error('Database connection error', { error: err.message }); // تبديل الـ console.error
    process.exit(1);
  });

const server = app.listen(PORT, () => {
  logger.info('Hospital Management System started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    database: `${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`
  });
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.warn(`${signal} received. Starting graceful shutdown...`); // استخدام warn للتحذيرات
  
  server.close(() => {
    logger.info('HTTP server closed.');
    
    db.destroy()
      .then(() => { 
        logger.info('Database pool destroyed.'); 
        process.exit(0); 
      })
      .catch((err) => { 
        logger.error('Error destroying pool', { error: err.message }); 
        process.exit(1); 
      });
  });

  setTimeout(() => { 
    logger.error('Forcefully shutting down due to timeout'); 
    process.exit(1); 
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));