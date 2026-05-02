import { seedUsers } from './users.seed';
import { seedAdmin } from './admin.seed';
async function run() {
  try {
    await seedUsers();
    await seedAdmin();
    process.exit(0);
  } catch (error) {
    console.error('Seed execution failed:', error);
    process.exit(1);
  }
}

run();
