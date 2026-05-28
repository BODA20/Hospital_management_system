import { seedUsers } from './users.seed';
import { seedAdmin } from './admin.seed';
import logger from '../common/utils/logger';

async function run() {
  try {
    await seedUsers();
    await seedAdmin();
    process.exit(0);
  } catch (error) {
    logger.error('Seed execution failed', { error: error instanceof Error ? error.message : error });
    process.exit(1);
  }
}

run();
