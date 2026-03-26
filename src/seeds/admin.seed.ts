import bcrypt from 'bcrypt';
import db from '../config/db';
import { UserRole } from '../modules/users/user.types';
export async function seedAdmin() {
  const existing = await db('users')
    .where({ email: 'bodaAdmin@system.com' })
    .first();

  if (existing) {
    console.log('Admin already exists');
    return;
  }

  const hashed = await bcrypt.hash('Admin123!', 12);

  await db('users').insert({
    name: 'Boda Admin',
    email: 'bodadmin@system.com',
    password: hashed,
    role: UserRole.ADMIN,
    is_active: true,
  });

  console.log('Admin seeded ✅');
}
