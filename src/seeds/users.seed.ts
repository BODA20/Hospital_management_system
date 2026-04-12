import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import db from '../config/db';
import { UserRole } from '../modules/users/user.types';

export async function seedUsers() {
  const users = [];

  for (let i = 0; i < 10; i++) {
    const password = await bcrypt.hash('User123!', 12);

    users.push({
      full_name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password,
      is_active: true,
      role: faker.helpers.arrayElement([UserRole.PATIENT]),
    });
  }

  await db('users').insert(users);

  console.log('Fake users seeded ✅');
}
