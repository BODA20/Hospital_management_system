import { seedAdmin } from './admin.seed';
import { seedUsers } from './users.seed';

async function run() {
  // await seedAdmin();
  await seedUsers();
  // await seedAdmin2();
  process.exit();
}

run();
