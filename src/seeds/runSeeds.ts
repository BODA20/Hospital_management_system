import { seedUsers } from './users.seed';

async function run() {
  try {
    await seedUsers();
    process.exit(0);
  } catch (error) {
    console.error('Seed execution failed:', error);
    process.exit(1);
  }
}

run();
