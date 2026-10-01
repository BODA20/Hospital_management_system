import bcrypt from 'bcrypt';
import db from '../config/db';
import { UserRole } from '../modules/users/user.types';
import logger from '../common/utils/logger';

export async function seed() {
  const existing = await db('users')
    .where({ email: 'bodadmin@system.com' })
    .first();

  if (existing) {
    logger.info('Admin already exists');
    return;
  }

  const hashed = await bcrypt.hash('Admin123!', 12);

  await db.raw(
    `INSERT INTO users (full_name, email, password_hash, role, is_active, phone)
     VALUES (?, ?, ?, ?, true, 'NOT_PROVIDED')`,
    ['Boda Admin', 'bodadmin@system.com', hashed, UserRole.ADMIN]
  );

  logger.info('Admin seeded ✅');
}
